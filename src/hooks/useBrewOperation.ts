import { useState, useCallback, useRef } from "react";
import { streamBrewOperation, cancelBrewOperation } from "../services/api";
import { OpEvent } from "../types/brew";

export interface TerminalState {
  isOpen: boolean;
  title: string;
  output: string;
  status: "idle" | "running" | "success" | "error" | "cancelled";
  exitCode: number | null;
  activeOpId: string | null;
}

export function useBrewOperation() {
  const [terminalState, setTerminalState] = useState<TerminalState>({
    isOpen: false,
    title: "",
    output: "",
    status: "idle",
    exitCode: null,
    activeOpId: null,
  });
  const [isActionRunning, setIsActionRunning] = useState(false);
  const activeOpIdRef = useRef<string | null>(null);

  const runOperation = useCallback(
    async (
      title: string,
      args: string[],
      options?: {
        onSuccess?: () => void;
        onError?: (err: string) => void;
      }
    ): Promise<boolean> => {
      const opId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      activeOpIdRef.current = opId;

      setIsActionRunning(true);
      setTerminalState({
        isOpen: true,
        title,
        output: `==> Running: brew ${args.join(" ")}\n`,
        status: "running",
        exitCode: null,
        activeOpId: opId,
      });

      return new Promise((resolve) => {
        let finalExitCode: number | null = null;
        let isCancelled = false;

        streamBrewOperation(opId, args, (event: OpEvent) => {
          if (activeOpIdRef.current !== opId) return;

          switch (event.type) {
            case "Stdout":
            case "Stderr":
              setTerminalState((prev) => ({
                ...prev,
                output: prev.output + event.data + "\n",
              }));
              break;
            case "Exit":
              finalExitCode = event.data;
              break;
            case "Error":
              setTerminalState((prev) => ({
                ...prev,
                output: prev.output + `\n==> Error: ${event.data}\n`,
                status: "error",
              }));
              break;
          }
        })
          .then(() => {
            const success = finalExitCode === 0;
            const newStatus = isCancelled ? "cancelled" : success ? "success" : "error";
            setTerminalState((prev) => ({
              ...prev,
              status: newStatus,
              exitCode: finalExitCode,
              output:
                prev.output +
                `\n==> Process completed with exit code ${finalExitCode ?? "unknown"}.\n`,
            }));
            setIsActionRunning(false);
            if (success) {
              options?.onSuccess?.();
            } else if (!isCancelled) {
              options?.onError?.(`Exited with code ${finalExitCode}`);
            }
            resolve(success);
          })
          .catch((err: any) => {
            const errStr = typeof err === "string" ? err : err?.message || String(err);
            setTerminalState((prev) => ({
              ...prev,
              status: "error",
              output: prev.output + `\n==> Execution error: ${errStr}\n`,
            }));
            setIsActionRunning(false);
            options?.onError?.(errStr);
            resolve(false);
          });
      });
    },
    []
  );

  const cancelActiveOperation = useCallback(async () => {
    const currentOp = activeOpIdRef.current;
    if (currentOp) {
      setTerminalState((prev) => ({
        ...prev,
        status: "cancelled",
        output: prev.output + "\n==> Operation cancelled by user.\n",
      }));
      await cancelBrewOperation(currentOp);
      setIsActionRunning(false);
      activeOpIdRef.current = null;
    }
  }, []);

  const closeTerminal = useCallback(() => {
    setTerminalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openTerminal = useCallback(() => {
    setTerminalState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  return {
    terminalState,
    isActionRunning,
    runOperation,
    cancelActiveOperation,
    closeTerminal,
    openTerminal,
    setTerminalState,
  };
}
