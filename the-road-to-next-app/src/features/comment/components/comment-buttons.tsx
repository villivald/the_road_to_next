import { AttachmentCreateButton } from "@/features/attachments/components/attachment-create-button";
import { CommentDeleteButton } from "./comment-delete-button";
import { CommentEditButton } from "./comment-edit-button";

type CommentButtonsProps = {
  id: string;
  setIsInEditMode?: (id: string) => void;
  onDeleteComment?: (id: string) => void;
  onCreateAttachment?: (commentId: string) => void;
};

const CommentButtons = ({
  id,
  setIsInEditMode,
  onDeleteComment,
  onCreateAttachment,
}: CommentButtonsProps) => {
  return (
    <>
      <AttachmentCreateButton
        key={`attach-${id}`}
        entityId={id}
        entity="COMMENT"
        onCreateAttachment={onCreateAttachment}
      />
      <CommentDeleteButton
        key={`delete-${id}`}
        id={id}
        onDeleteComment={onDeleteComment}
      />
      <CommentEditButton
        key={`edit-${id}`}
        id={id}
        setIsInEditMode={setIsInEditMode}
      />
    </>
  );
};
export { CommentButtons };
