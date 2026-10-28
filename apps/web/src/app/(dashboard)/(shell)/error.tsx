"use client";

import { ErrorState } from "@tripory/ui-web";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
};

export default function ErrorPage(props: ErrorPageProps) {
  return <ErrorState className="flex-1" onRetry={props.retry} variant="page" />;
}
