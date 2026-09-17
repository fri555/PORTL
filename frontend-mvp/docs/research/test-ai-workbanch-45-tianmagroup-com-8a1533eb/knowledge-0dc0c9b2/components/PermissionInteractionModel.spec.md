# Permission Interaction Model Specification

## Sources

- Visual source: captured production permission manager and member picker screenshots.
- Behavior source: AI 工作台 V1.2 PRD, modules M8（下载权限）and M9（细粒度权限）.

## Resource permission state

- Resource levels are knowledge base, folder, and file.
- A child defaults to `inherit` and resolves its effective view subjects and download mode from its direct parent.
- Choosing `单独设置` switches the child to `break`. Its selected view subjects fully replace inherited subjects and later parent changes do not affect it.
- Download mode is independently stored as `inherit`, `allow`, or `deny`. View permission remains a prerequisite for download.
- A saved `break` resource shows a lock marker in both the left tree and right list immediately.

## Draft transaction

- Opening the permission dialog copies persisted state and revision into a draft.
- Member additions/removals, inheritance changes, and download changes mutate only the draft.
- Closing or cancelling either dialog rolls back that dialog's unconfirmed changes.
- The add-member picker has real department/person tabs, search, checkbox selection, live selected count, selected-item removal, Cancel rollback, and Confirm-to-draft.
- The main dialog filters current members locally as the user types.

## Validation and save

- `单独设置` requires at least one view subject; otherwise show `至少保留一个可查看对象`.
- Save first opens an impact confirmation containing `本次变更将影响N个子资源的权限` and a change summary.
- Cancelling impact confirmation returns to the editor without committing.
- Confirming commits the draft only if the persisted revision still matches.
- Revision mismatch shows `权限已被他人修改，请刷新后重试` and a Refresh action.
- If admin authority is lost, save is rejected with `你已无权限编辑此资源权限`.
- Non-admin users can inspect effective permission but all editing and save controls are disabled.

## Download behavior

- `allow` exposes the download entry only to view-authorized subjects.
- `deny` hides the download entry and shows `你可以查看该文件，但当前没有下载权限`.
- Download preparation uses `正在准备下载...`; generated links expire within 30 minutes.
- A permission revision change invalidates an existing mock link and interrupts an in-progress mock download with `下载权限已变更`.
- Batch download evaluates each file independently, skips unauthorized items, and summarizes failures with a retry action.

## Visual constraints

- Preserve the production modal hierarchy, 480px manager width, 700px member-picker width, typography, member rows, role menu, black primary buttons, and gray overlay.
- PRD controls are added as compact sections inside the existing manager rather than replacing it with a new visual language.
