import { Suspense } from "react";
import { RoomScreen } from "@/components/RoomScreen";
import { Shell } from "@/components/ui";

// With Cache Components, reading params must sit under Suspense; the PIN is only known per request.
async function Room({ params }: { params: PageProps<"/room/[pin]">["params"] }) {
  const { pin } = await params;
  return <RoomScreen pin={pin} />;
}

export default function RoomPage(props: PageProps<"/room/[pin]">) {
  return (
    <Suspense
      fallback={
        <Shell center>
          <p className="text-center text-lg font-bold text-indigo-200">Loading…</p>
        </Shell>
      }
    >
      <Room params={props.params} />
    </Suspense>
  );
}
