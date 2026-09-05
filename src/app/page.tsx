import { Tape } from "@/components/Tape";
import { Movers } from "@/components/Movers";
import { Macro } from "@/components/Macro";

export default function MarketsPage() {
  return (
    <>
      <Tape />
      <div className="grid md:grid-cols-[1fr_360px]">
        <Movers />
        <Macro />
      </div>
    </>
  );
}
