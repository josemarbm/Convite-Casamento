import pandas as pd
import requests
import re
import base64
import os


# CONFIGURAÇÕES
SERVER_URL = "http://127.0.0.1:8080"  # Altere se usar EvolutionAPI em nuvem
SESSION_ID = "default"
API_KEY = "12345"
PLANILHA_CONVIDADOS = "convidados-teste.xlsx"
VIDEO_PATH = "convite.png"

MENSAGEM = (
    "Querido(a) *{nome}*,\n\n"
    "📣 CHEGOU O GRANDE MOMENTO!! 🚨\n"
    "É com muito carinho que enviamos o convite do nosso casamento! 💐 ❤️\n\n"

    "Sua presença tornará nosso dia ainda mais especial.\n"
    "🗓️ Por favor, confirme até *16/12/2025* no link abaixo\n\n"

    "👉 Confirmar presença:\n"
    "https://noivos.casar.com/gabrielaejosemar?preview_as_guest=1&_ref_=/one-page/home#/rsvp\n\n"

    "🎁 Lista de presentes:\n"
    "https://noivos.casar.com/gabrielaejosemar?preview_as_guest=1&_ref_=/one-page/home#/lista-de-presentes\n\n"

    "🌐 Site do casamento:\n"
    "http://noivos.casar.com/gabrielaejosemar\n\n"

    "💒Local:\n"
    "https://maps.app.goo.gl/5EXFabhRzoVqHhYP9\n\n"

    "Com carinho,\n"
    "_Gabriela & Josemar_ 💍💍"
)

# -------- Funções auxiliares --------

def formatar_telefone(numero):
    """Remove caracteres não numéricos e adiciona o DDI se necessário."""
    numero = re.sub(r'\D', '', str(numero))
    
    # Verifica se o número é dos Estados Unidos
    if len(numero) == 10:  # Número de telefone dos EUA tem 10 dígitos
        return f"+1 {numero[:3]} {numero[3:6]}-{numero[6:]}"
    
    # Se não for dos EUA, adiciona o DDI +55
    if not numero.startswith("55"):
        numero = "55" + numero
    
    return numero

def enviar_video(numero, caminho_arquivo, legenda, mensagem):
    """Envia um vídeo com legenda via EvolutionAPI."""
    url = f"{SERVER_URL}/message/sendMedia/{SESSION_ID}"

    with open('convite.png', "rb") as video_file:
        file_binary = video_file.read()
        file_b64 = base64.b64encode(file_binary).decode("utf-8")
        payload = {
            "number": numero,
                "options": {
                "delay": 200,
                "presence": "composing"
            },
            "caption": legenda,
            "mediaMessage": {
                "mediatype": "image",
                "fileName": "convite.png",
                "caption": mensagem,
                "media": file_b64
            }
        }
        headers = {
            "apikey": API_KEY,
            "Content-Type": "application/json"
        }
    

        response = requests.post(url, json=payload, headers=headers)
        return response

# -------- Função principal --------

def enviar_convites():
    """Carrega a planilha, remove duplicados e envia convites."""
    try:
        df = pd.read_excel(PLANILHA_CONVIDADOS)
    except FileNotFoundError:
        print(f"❌ Planilha '{PLANILHA_CONVIDADOS}' não encontrada.")
        return

    if "Telefone" not in df.columns:
        print("❌ A planilha precisa ter a coluna 'Telefone'.")
        return

    # -------- NOVO PASSO: cria coluna com telefone formatado --------
    df["TelefoneFormatado"] = df["Telefone"].apply(formatar_telefone)

    # Remove duplicados com base no número formatado
    df = df.drop_duplicates(subset=["TelefoneFormatado"], keep="first")

    print(f"📋 Total de convidados após remover duplicados: {len(df)}")

    # -------- Envio --------
    for _, row in df.iterrows():
        nome = row.get("Nome")
        numero = row.get("TelefoneFormatado")

        if pd.isna(nome) or pd.isna(numero):
            print("⚠️ Linha ignorada (dados incompletos)")
            continue

        mensagem = MENSAGEM.format(nome=nome)

        print(f"📨 Enviando convite para {nome} ({numero})...")

        try:
            r2 = enviar_video(numero, VIDEO_PATH, mensagem, mensagem)
            print("   ✅ PDF:", r2.status_code, r2.text)

        except Exception as e:
            print(f"   ❌ Erro ao enviar para {nome}: {e}")


# -------- Execução --------

if __name__ == "__main__":
    enviar_convites()
