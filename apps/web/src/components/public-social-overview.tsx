"use client";
// lớp keo ghép `itinerary` và `social` ở cấp app cho tab Tổng quan của chế độ Bản đồ (D-21): module web không
// import nhau (kiến trúc mục 7). "Xem bình luận" yêu cầu focus khối bình luận rồi đổi về Bài viết (đẩy một mục
// lịch sử như viên thuốc, 05 D-08). cuộn và focus `h2` do `CommentSection` làm khi bài viết hết `hidden`
// (RESEARCH R6), nên ở đây không focus viên thuốc hay phần tử nào.
// `usePublicView` cần `<Suspense>`: tab Tổng quan chỉ mount trong `PublicMapMode`, ở nhánh chính của
// `PublicItineraryView` đã có boundary.
import { useCallback } from "react";
import { usePublicView } from "@/modules/itinerary/ui/use-public-view";
import { OverviewSocialRow } from "@/modules/social/ui/overview-social-row";
import { useSocialComments } from "@/modules/social/ui/social-context";

export function PublicSocialOverview() {
  const { setView } = usePublicView();
  const { requestFocus } = useSocialComments();
  const handleViewComments = useCallback(() => {
    requestFocus();
    setView("article");
  }, [requestFocus, setView]);
  return <OverviewSocialRow onViewComments={handleViewComments} visible />;
}
