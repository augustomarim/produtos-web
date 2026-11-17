import { NextRequest } from "next/server";
import { encaminharNotificacoes } from "../../../../src/lib/proxy-notificacoes";
export function PATCH(request: NextRequest) {
  return encaminharNotificacoes(request, "PATCH");
}
