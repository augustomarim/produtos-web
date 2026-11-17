import { NextRequest } from "next/server";
import { encaminharNotificacoes } from "../../../src/lib/proxy-notificacoes";
export function GET(request: NextRequest) {
  return encaminharNotificacoes(request, "GET");
}
