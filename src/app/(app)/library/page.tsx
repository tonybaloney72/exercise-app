"use client";

import dynamic from "next/dynamic";
import TabRouteLoadingSkeleton from "@/components/common/TabRouteLoadingSkeleton";

const LibraryPageContent = dynamic(() => import("./LibraryPageContent"), {
  loading: () => <TabRouteLoadingSkeleton />,
});

export default function LibraryPage() {
  return <LibraryPageContent />;
}
