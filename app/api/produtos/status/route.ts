import { NextRequest } from "next/server";
import { encaminharLote } from "../../../../src/lib/proxy-lote";
export async function PATCH(request: NextRequest) {
  return encaminharLote(request, "PATCH");
}
