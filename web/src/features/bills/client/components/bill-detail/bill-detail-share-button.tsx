"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BillShareModal } from "../share/bill-share-modal";

interface BillDetailShareButtonProps {
  shareMessage: string;
  shareUrl: string;
  thumbnailUrl?: string | null;
}

export function BillDetailShareButton({
  shareMessage,
  shareUrl,
  thumbnailUrl,
}: BillDetailShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="h-11 gap-1 px-4 text-xs"
      >
        <Image
          src="/icons/ios-share.svg"
          alt="共有アイコン"
          width={20}
          height={20}
          className="shrink-0"
        />
        共有する
      </Button>

      <BillShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shareMessage={shareMessage}
        shareUrl={shareUrl}
        thumbnailUrl={thumbnailUrl}
      />
    </>
  );
}
