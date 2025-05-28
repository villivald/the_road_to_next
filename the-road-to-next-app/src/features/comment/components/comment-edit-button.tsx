"use client";

import { LucidePencil } from "lucide-react";
import { Button } from "@/components/ui/button";

type CommentEditButtonProps = {
  id: string;
  setIsInEditMode?: (id: string) => void;
};

const CommentEditButton = ({ id, setIsInEditMode }: CommentEditButtonProps) => {
  return (
    <Button variant="outline" size="icon" onClick={() => setIsInEditMode?.(id)}>
      <LucidePencil className="h-4 w-4" />
    </Button>
  );
};
export { CommentEditButton };
