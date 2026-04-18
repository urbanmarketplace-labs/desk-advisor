import { diagnoseWorkspace } from "@/core/diagnose";
import type { AssessmentInput } from "@/types/assessment";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as AssessmentInput;
  const result = diagnoseWorkspace(body);

  return Response.json(result);
}
