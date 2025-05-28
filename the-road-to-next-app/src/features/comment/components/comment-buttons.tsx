import { CommentDeleteButton } from "./comment-delete-button";
import { CommentEditButton } from "./comment-edit-button";

type CommentButtonsProps = {
  id: string;
  setIsInEditMode?: (id: string) => void;
};

const CommentButtons = ({ id, setIsInEditMode }: CommentButtonsProps) => {
  return (
    <>
      <CommentDeleteButton key={`delete-${id}`} id={id} />
      <CommentEditButton
        key={`edit-${id}`}
        id={id}
        setIsInEditMode={setIsInEditMode}
      />
    </>
  );
};
export { CommentButtons };
