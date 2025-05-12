import { useEffect, useRef } from "react";
import { ActionState } from "../utils/to-action-state";

type UseActionFeedbackOptions = {
  onSuccess?: ({ actionState }: { actionState: ActionState }) => void;
  onError?: ({ actionState }: { actionState: ActionState }) => void;
};

const useActionFeedback = (
  actionState: ActionState,
  options: UseActionFeedbackOptions,
) => {
  const prevTimestamp = useRef(actionState.timestamp);
  const isUpdate = actionState.timestamp !== prevTimestamp.current;

  useEffect(() => {
    if (!isUpdate) return;

    if (actionState.status === "SUCCESS") {
      options.onSuccess?.({ actionState });
    }

    if (actionState.status === "ERROR") {
      options.onError?.({ actionState });
    }

    prevTimestamp.current = actionState.timestamp;
  }, [actionState, options, isUpdate]);
};

export { useActionFeedback };
