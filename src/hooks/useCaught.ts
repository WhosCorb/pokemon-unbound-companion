"use client";

import { useContext } from "react";
import { CaughtContext } from "@/contexts/CaughtContext";

export function useCaught() {
  const context = useContext(CaughtContext);
  if (!context) {
    throw new Error("useCaught must be used within a CaughtProvider");
  }
  return context;
}
