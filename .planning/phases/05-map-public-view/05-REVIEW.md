---
phase: 05-map-public-view
status: skipped
reviewed: 2026-11-11
---
# Phase 5: Code review

Bỏ qua: skill `gsd-code-review` cần subagent độc lập mà môi trường này không có, và việc tự review code do chính mình viết không có giá trị độc lập. Bước này chỉ mang tính khuyến nghị.

Thay thế một phần: mỗi plan chạy lint/typecheck/test, 7 bất biến tĩnh mới (05-19), và một lần chạy build thật tìm ra lỗi RSC ở `PublicForbidden` (đã sửa). Nên chạy `/gsd-code-review 5` ở phiên khác để có góc nhìn độc lập.
