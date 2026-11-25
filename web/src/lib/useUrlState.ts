import { useEffect, useMemo, useState } from 'react';
import {
  createUrlStateController,
  windowPort,
  type HistoryPort,
  type ParsedUrlState,
  type UrlStateController,
} from './urlState';

/**
 * T-009 hook: read the URL once, follow `popstate`, and write back through the
 * port. The controller is pure JS, so the read → subscribe → write cycle is
 * covered by unit tests with a fake port; this file only binds it to React.
 */
export function useUrlState(port: HistoryPort = windowPort): readonly [ParsedUrlState, UrlStateController] {
  const controller = useMemo(() => createUrlStateController(port), [port]);
  const [parsed, setParsed] = useState<ParsedUrlState>(() => controller.get());

  useEffect(() => {
    setParsed(controller.get());
    const unsubscribe = controller.subscribe(() => setParsed(controller.get()));
    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  return [parsed, controller] as const;
}
