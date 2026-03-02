"use client";

import { useContext } from "react";
import { PcContext } from "@/contexts/PcContext";

export function usePc() {
  const context = useContext(PcContext);
  if (!context) {
    throw new Error("usePc must be used within a PcProvider");
  }
  return context;
}
