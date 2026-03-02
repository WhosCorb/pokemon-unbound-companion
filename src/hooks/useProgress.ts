"use client";

import { useContext } from "react";
import { ProgressContext } from "@/contexts/ProgressContext";

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}
