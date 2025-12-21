from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from datetime import datetime
from models import db, ScheduledSend, Guest, MessageTemplate
from services.whatsapp_service import WhatsAppService

class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.whatsapp_service = WhatsAppService()
        self.scheduler.start()
    
    def schedule_send(self, scheduled_send_id, scheduled_time):
        """Schedule a send task"""
        job_id = f"scheduled_send_{scheduled_send_id}"
        
        # Remove existing job if it exists
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
        
        # Add new job
        self.scheduler.add_job(
            func=self._execute_scheduled_send,
            trigger=DateTrigger(run_date=scheduled_time),
            args=[scheduled_send_id],
            id=job_id,
            name=f"Scheduled Send #{scheduled_send_id}",
            misfire_grace_time=300  # 5 minutes grace period
        )
        
        print(f"✅ Scheduled send #{scheduled_send_id} for {scheduled_time}")
    
    def cancel_scheduled_send(self, scheduled_send_id):
        """Cancel a scheduled send"""
        job_id = f"scheduled_send_{scheduled_send_id}"
        
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
            print(f"❌ Cancelled scheduled send #{scheduled_send_id}")
            return True
        
        return False
    
    def _execute_scheduled_send(self, scheduled_send_id):
        """Execute a scheduled send (called by scheduler)"""
        from app import app  # Import here to avoid circular dependency
        
        with app.app_context():
            try:
                scheduled_send = ScheduledSend.query.get(scheduled_send_id)
                
                if not scheduled_send:
                    print(f"⚠️ Scheduled send #{scheduled_send_id} not found")
                    return
                
                if scheduled_send.status != 'pending':
                    print(f"⚠️ Scheduled send #{scheduled_send_id} already processed (status: {scheduled_send.status})")
                    return
                
                # Get template
                template = scheduled_send.template
                if not template:
                    print(f"⚠️ Template not found for scheduled send #{scheduled_send_id}")
                    scheduled_send.status = 'failed'
                    db.session.commit()
                    return
                
                # Get guests to send to
                guests = []
                if scheduled_send.group_id:
                    # Send to all guests in group
                    guests = Guest.query.filter_by(group_id=scheduled_send.group_id).all()
                elif scheduled_send.guest_ids:
                    # Send to specific guests
                    guest_ids = scheduled_send.get_guest_ids()
                    guests = Guest.query.filter(Guest.id.in_(guest_ids)).all()
                
                if not guests:
                    print(f"⚠️ No guests found for scheduled send #{scheduled_send_id}")
                    scheduled_send.status = 'failed'
                    db.session.commit()
                    return
                
                # Send to each guest
                success_count = 0
                fail_count = 0
                
                for guest in guests:
                    if guest.status == 'sent':
                        print(f"⏭️ Skipping {guest.name} - already sent")
                        continue
                    
                    try:
                        # Personalize message
                        message = template.content.replace('{nome}', guest.name)
                        
                        # Send via WhatsApp
                        result = self.whatsapp_service.send_message(
                            phone=guest.phone,
                            message=message,
                            image_path=self.whatsapp_service.image_path
                        )
                        
                        if result.get('success'):
                            guest.status = 'sent'
                            guest.sent_at = datetime.utcnow()
                            success_count += 1
                            print(f"✅ Sent to {guest.name} ({guest.phone})")
                        else:
                            guest.status = 'failed'
                            fail_count += 1
                            print(f"❌ Failed to send to {guest.name}: {result.get('error', 'Unknown error')}")
                    
                    except Exception as e:
                        guest.status = 'failed'
                        fail_count += 1
                        print(f"❌ Error sending to {guest.name}: {e}")
                
                # Update scheduled send status
                scheduled_send.status = 'completed'
                scheduled_send.completed_at = datetime.utcnow()
                db.session.commit()
                
                print(f"✅ Scheduled send #{scheduled_send_id} completed: {success_count} sent, {fail_count} failed")
            
            except Exception as e:
                print(f"❌ Error executing scheduled send #{scheduled_send_id}: {e}")
                if scheduled_send:
                    scheduled_send.status = 'failed'
                    db.session.commit()
    
    def load_pending_schedules(self):
        """Load pending scheduled sends from database (call on app startup)"""
        from app import app
        
        with app.app_context():
            pending_sends = ScheduledSend.query.filter_by(status='pending').all()
            
            now = datetime.utcnow()
            for send in pending_sends:
                if send.scheduled_time > now:
                    # Future send - schedule it
                    self.schedule_send(send.id, send.scheduled_time)
                else:
                    # Past due - mark as failed
                    send.status = 'failed'
                    print(f"⚠️ Marked past-due scheduled send #{send.id} as failed")
            
            db.session.commit()
            print(f"✅ Loaded {len([s for s in pending_sends if s.scheduled_time > now])} pending scheduled sends")
    
    def shutdown(self):
        """Shutdown the scheduler"""
        self.scheduler.shutdown()

# Global scheduler instance
scheduler_service = None

def get_scheduler():
    """Get the global scheduler instance"""
    global scheduler_service
    if scheduler_service is None:
        scheduler_service = SchedulerService()
    return scheduler_service
