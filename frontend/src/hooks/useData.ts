import { useEffect, useState } from "react";
import type { AppData } from "../types";
import {
  PLACEHOLDER_DATA,
  getDataStatus,
  isValidAppData,
  type DataStatus,
} from "../lib/placeholderData";

interface State {
  data: AppData;
  loading: boolean;
  error: string | null;
  status: DataStatus;
}

export function useData(): State {
  const [state, setState] = useState<State>({
    data: PLACEHOLDER_DATA,
    loading: true,
    error: null,
    status: "placeholder",
  });

  useEffect(() => {
    let cancelled = false;

    fetch(`${import.meta.env.BASE_URL}data.json`, { cache: "no-cache" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "data.json não encontrado (execute ./prepare.sh)"
              : `Falha ao carregar data.json: HTTP ${res.status}`
          );
        }
        return res.json() as Promise<unknown>;
      })
      .then((raw) => {
        if (cancelled) return;
        if (!isValidAppData(raw)) {
          setState({
            data: PLACEHOLDER_DATA,
            loading: false,
            error: "data.json inválido ou corrompido",
            status: "placeholder",
          });
          return;
        }
        setState({
          data: raw,
          loading: false,
          error: null,
          status: getDataStatus(raw),
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: PLACEHOLDER_DATA,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
            status: "placeholder",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
