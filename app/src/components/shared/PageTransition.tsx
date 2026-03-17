"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface PageTransitionProps {
  readonly children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
