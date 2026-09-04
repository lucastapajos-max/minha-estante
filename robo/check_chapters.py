#!/usr/bin/env python3
"""
Robô das notificações da Estante.
Roda no GitHub Actions de tempos em tempos:
  1. lê no Supabase os mangás com o sino ligado (notify = true)
  2. consulta a MangaBaka o último capítulo lançado de cada um
  3. se saiu capítulo novo, manda um push pra cada dispositivo inscrito
  4. atualiza o "último capítulo avisado" pra não repetir

Variáveis de ambiente (vindas dos segredos do repo):
  SUPABASE_URL           ex.: https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY   chave service_role (bypassa RLS) — SEGREDO
  VAPID_PRIVATE_KEY      chave privada VAPID em PEM        — SEGREDO
  VAPID_SUBJECT          ex.: mailto:voce@email.com
"""
import os, json, time, sys
import requests
from pywebpush import webpush, WebPushException

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_KEY"]
VAPID_PRIVATE = os.environ["VAPID_PRIVATE_KEY"]
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:exemplo@email.com")
APP_URL = os.environ.get("APP_URL", "https://minha-estante.lucastapajos.workers.dev")

SB_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# a chave privada vem como PEM no segredo → grava num arquivo pro pywebpush
PEM_PATH = "vapid_private.pem"
with open(PEM_PATH, "w") as f:
    f.write(VAPID_PRIVATE.replace("\\n", "\n").strip() + "\n")


def sb_get(path):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_patch(path, body):
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS,
                       data=json.dumps(body), timeout=30)
    r.raise_for_status()


def sb_delete(path):
    requests.delete(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS, timeout=30)


def mangabaka_ultimo(mangabaka_id, titulo):
    """Último capítulo lançado (inteiro) ou None. Retorna (id, ultimo)."""
    def _caps(serie):
        try:
            return int(float(serie.get("total_chapters")))
        except (TypeError, ValueError):
            return None
    try:
        mid = mangabaka_id
        serie = None
        if mid:
            r = requests.get(f"https://api.mangabaka.org/v1/series/{mid}", timeout=30)
            if r.ok:
                serie = r.json().get("data")
        if not serie:
            s = requests.get("https://api.mangabaka.org/v1/series/search",
                             params={"limit": 1, "q": titulo}, timeout=30)
            data = s.json().get("data", [])
            if not data:
                return mid, None
            serie = data[0]
            mid = str(serie.get("id") or mid or "")
        return mid, _caps(serie)
    except Exception as e:
        print(f"  ! erro MangaBaka ({titulo}): {e}")
        return mangabaka_id, None


def enviar_push(sub, payload):
    """Manda um push. Retorna 'ok', 'expirada' ou 'erro'."""
    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
            },
            data=json.dumps(payload),
            vapid_private_key=PEM_PATH,
            vapid_claims={"sub": VAPID_SUBJECT},
            timeout=30,
        )
        return "ok"
    except WebPushException as e:
        code = getattr(e.response, "status_code", None)
        if code in (404, 410):        # inscrição morta → limpar depois
            return "expirada"
        print(f"  ! push falhou ({code}): {e}")
        return "erro"


def main():
    itens = sb_get("items?notify=eq.true&kind=eq.manga"
                   "&select=id,user_id,title,mangabaka_id,last_notified_chapter,total_chapters")
    print(f"{len(itens)} mangá(s) vigiado(s).")
    for it in itens:
        titulo = it["title"]
        ultimo_avisado = it.get("last_notified_chapter") or 0
        mid, ultimo = mangabaka_ultimo(it.get("mangabaka_id"), titulo)
        time.sleep(0.4)  # gentileza com a API da MangaBaka
        if ultimo is None:
            print(f"- {titulo}: sem dado de capítulo, pulando.")
            continue
        # guarda o id da MangaBaka se ainda não tínhamos
        if mid and not it.get("mangabaka_id"):
            sb_patch(f"items?id=eq.{it['id']}", {"mangabaka_id": mid})
        if ultimo <= ultimo_avisado:
            print(f"- {titulo}: cap {ultimo} (já avisado até {ultimo_avisado}).")
            continue

        print(f"- {titulo}: NOVO capítulo {ultimo} (era {ultimo_avisado}) → notificando")
        # atualiza o total na biblioteca JÁ (antes do push), pra o app não ficar
        # defasado quando o usuário abrir. Só sobe, nunca diminui.
        total_atual = it.get("total_chapters") or 0
        if ultimo > total_atual:
            sb_patch(f"items?id=eq.{it['id']}", {"total_chapters": ultimo})
        subs = sb_get(f"push_subscriptions?user_id=eq.{it['user_id']}"
                      "&select=id,endpoint,p256dh,auth")
        payload = {
            "title": titulo,
            "body": f"Capítulo {ultimo} saiu! 🎉",
            "url": APP_URL,
            "tag": it["id"],
        }
        algum_ok = False
        for sub in subs:
            res = enviar_push(sub, payload)
            if res == "ok":
                algum_ok = True
            elif res == "expirada":
                sb_delete(f"push_subscriptions?id=eq.{sub['id']}")
        # só marca como avisado se pelo menos um push saiu (ou não há inscrição)
        if algum_ok or not subs:
            sb_patch(f"items?id=eq.{it['id']}", {"last_notified_chapter": ultimo})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERRO geral: {e}", file=sys.stderr)
        sys.exit(1)
