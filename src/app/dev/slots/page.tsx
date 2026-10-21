// Hidden dev tool (spec section 6): mark the slots of a background and export the JSON. Local only.

import { notFound } from "next/navigation";
import { SlotEditor } from "@/components/SlotEditor";

export default function SlotsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SlotEditor />;
}
