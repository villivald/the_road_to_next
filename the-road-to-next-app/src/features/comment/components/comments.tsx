"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CardCompact } from "@/components/card-compact";
import { fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { Button } from "@/components/ui/button";
import { AttachmentDeleteButton } from "@/features/attachments/components/attachment-delete-button";
import { AttachmentList } from "@/features/attachments/components/attachment-list";
import { isOwner } from "@/features/auth/utils/is-owner";
import { User } from "@/generated/prisma";
import { PaginatedData } from "@/types/pagination";
import { getComments } from "../queries/get-comments";
import { CommentWithMetadata } from "../types";
import { CommentCreateForm } from "./comment-create-form";
import { CommentItem } from "./comment-item";

type CommentsProps = {
  ticketId: string;
  user: User | null;
  paginatedComments: PaginatedData<CommentWithMetadata>;
};

const Comments = ({ ticketId, paginatedComments, user }: CommentsProps) => {
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  const queryKey = ["comments", ticketId];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => getComments(ticketId, pageParam),
      initialPageParam: undefined as
        | { id: string; createdAt: number }
        | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.metadata.hasNextPage ? lastPage.metadata.cursor : undefined,
      initialData: {
        pages: [
          {
            list: paginatedComments.list,
            metadata: paginatedComments.metadata,
          },
        ],
        pageParams: [undefined],
      },
    });

  const comments = data.pages.flatMap((page) => page.list);

  const queryClient = useQueryClient();

  const handleMore = () => fetchNextPage();

  const handleShowAll = async () => {
    if (!hasNextPage || isFetchingAll) return;

    setIsFetchingAll(true);

    try {
      let hasMore: boolean = hasNextPage;
      while (hasMore) {
        const result = await fetchNextPage();
        const lastPage = result.data?.pages[result.data.pages.length - 1];

        hasMore = !!lastPage?.metadata.hasNextPage;
      }
    } catch (error) {
      fromErrorToActionState(error);
    } finally {
      setIsFetchingAll(false);
    }
  };

  const handleInvalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return (
    <>
      <CardCompact
        title="Add Comment"
        description="You can add comments to this ticket."
        content={
          <CommentCreateForm
            ticketId={ticketId}
            onCreateComment={handleInvalidateQueries}
          />
        }
      />

      <div className="ml-8 flex flex-col gap-y-2">
        {comments.map((comment) => {
          const sections = [];

          if (comment.attachments.length) {
            sections.push({
              label: "Attachments",
              content: (
                <AttachmentList
                  attachments={comment.attachments}
                  buttons={(attachmentId) => [
                    ...(comment.isOwner
                      ? [
                          <AttachmentDeleteButton
                            key="0"
                            id={attachmentId}
                            onDeleteAttachment={handleInvalidateQueries}
                          />,
                        ]
                      : []),
                  ]}
                />
              ),
            });
          }

          return (
            <CommentItem
              key={comment.id}
              comment={comment}
              sections={sections}
              isOwner={isOwner(user, comment)}
              onDeleteComment={handleInvalidateQueries}
              onUpdateComment={handleInvalidateQueries}
              onCreateAttachment={handleInvalidateQueries}
            />
          );
        })}
      </div>

      {hasNextPage && (
        <div className="ml-4 flex justify-end">
          <Button
            variant="ghost"
            onClick={handleMore}
            disabled={isFetchingNextPage}
          >
            Show a few more
          </Button>
          <Button
            variant="ghost"
            onClick={handleShowAll}
            disabled={isFetchingNextPage}
          >
            Show all ({paginatedComments.metadata.count})
          </Button>
        </div>
      )}
    </>
  );
};

export { Comments };
