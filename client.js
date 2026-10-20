/**
 * Browser half of the archived-conversations bundle.
 *
 * Contributes one main panel that lists every Session in the registry-global
 * archive set, grouped by Workspace, and one sidebar entry that selects that
 * panel. Restoring a row writes the existing Workspace unarchive operation;
 * opening a row restores first and then selects the Conversation.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-archived-conversations',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useRef, useState } = React;

    const NS = 'archived-conversations';
    const PANEL_ID = 'archived-conversations';
    const UNGROUPED = '__ungrouped__';

    const en = {
      nav: 'Archived conversations',
      title: 'Archived conversations',
      subtitle: 'Every archived conversation in one place. Archived conversations stay hidden in the workspace sidebar.',
      search: 'Search archived conversations',
      searchPlaceholder: 'Search by title, workspace, or session ID',
      clear: 'Clear search',
      count: 'archived conversations',
      items: 'conversations',
      loading: 'Loading archived conversations…',
      loadingDetails: 'Loading conversation details…',
      failed: 'Archived conversations could not be loaded.',
      emptyTitle: 'No archived conversations',
      emptyBody: 'Archive a conversation from its menu to hide it from the sidebar. It will appear here, ready to restore.',
      noMatchesTitle: 'No matching conversations',
      noMatchesBody: 'Try a different title, workspace, or session ID.',
      ungrouped: 'No workspace',
      untitled: 'Untitled conversation',
      missingTitle: 'Session unavailable',
      unknownDate: 'Unknown date',
      restore: 'Restore',
      open: 'Open',
      restoring: 'Restoring…',
      delete: 'Delete',
      deleteTitle: 'Move to trash?',
      deleteBody: 'The conversation will disappear from DSH and its archived list. On Windows its log directory is moved to the system Recycle Bin, where you can restore or empty it; other platforms use the DSH trash folder. Disk space is freed only when the Recycle Bin is emptied.',
      deleteConfirm: 'Move to trash',
      deleting: 'Moving…',
      cancel: 'Cancel',
      deleteSuccessSystem: 'Conversation moved to the Windows Recycle Bin.',
      deleteSuccessFolder: 'Conversation moved to the DSH trash folder.',
      deleteMissing: 'The session log was already gone; its archive entry was removed.',
      deletePartial: 'Log moved to trash, but removing the archive entry failed. Retry Delete to clear it.',
      totalSize: 'Total log size',
      sizeLabel: 'Log size (compressed, excluding attachments)',
      sizeLoading: '…',
      sizeUnknown: '—',
      sizeUnavailable: 'Session log sizes are unavailable. Restart DSH to load the updated Host route.',
      removeFailed: 'Could not move the conversation to trash: ',
      back: 'Back to conversation',
      errorRestore: 'Could not restore the conversation: ',
      errorOpen: 'Could not open the conversation: ',
    };

    const zh = {
      nav: '归档对话',
      title: '归档对话',
      subtitle: '集中查看所有已归档的对话。归档对话不会出现在工作区侧边栏中。',
      search: '搜索归档对话',
      searchPlaceholder: '搜索标题、工作区或会话 ID',
      clear: '清除搜索',
      count: '个归档对话',
      items: '个对话',
      loading: '正在加载归档对话…',
      loadingDetails: '正在加载对话详情…',
      failed: '无法加载归档对话。',
      emptyTitle: '暂无归档对话',
      emptyBody: '在对话的菜单中选择归档，即可将它从侧边栏收起。归档的对话会出现在这里，随时可以恢复。',
      noMatchesTitle: '没有匹配的对话',
      noMatchesBody: '试试其他标题、工作区或会话 ID。',
      ungrouped: '未归入工作区',
      untitled: '未命名对话',
      missingTitle: '会话不可用',
      unknownDate: '时间未知',
      restore: '恢复',
      open: '打开',
      restoring: '恢复中…',
      delete: '删除',
      deleteTitle: '移到回收站？',
      deleteBody: '对话将从 DSH 和归档列表中移除。Windows 会移到系统回收站，可在系统回收站中恢复或清空；其他平台移到 DSH 回收站。清空前不会释放磁盘空间。',
      deleteConfirm: '移到回收站',
      deleting: '正在移动…',
      cancel: '取消',
      deleteSuccessSystem: '对话已移到 Windows 系统回收站。',
      deleteSuccessFolder: '对话已移到 DSH 回收站。',
      deleteMissing: '会话日志已不存在，已从归档列表移除。',
      deletePartial: '日志已移到回收站，但移除归档记录失败。再执行一次删除即可清理。',
      totalSize: '日志总大小',
      sizeLabel: '日志大小（压缩后，不含附件）',
      sizeLoading: '…',
      sizeUnknown: '—',
      sizeUnavailable: '无法读取会话日志大小，请重启 DSH 以加载新的 Host 路由。',
      removeFailed: '移到回收站失败：',
      back: '返回对话',
      errorRestore: '恢复对话失败：',
      errorOpen: '打开对话失败：',
    };

    const CSS = `
      .ac-page {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        color: var(--dsw-alias-label-primary);
        background: var(--dsw-alias-bg-base);
        font-size: 14px;
        line-height: 1.6;
      }
      .ac-page * { box-sizing: border-box; }
      .ac-scroll {
        flex: 1;
        min-height: 0;
        overflow: auto;
        scrollbar-gutter: stable;
      }
      .ac-content {
        max-width: 960px;
        margin: 0 auto;
        padding: 0 clamp(24px, 4vw, 48px) 48px;
      }
      .ac-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding-top: 28px;
        margin-bottom: 6px;
      }
      .ac-heading-copy { min-width: 0; }
      .ac-heading h1 {
        margin: 0;
        font-size: 20px;
        line-height: 28px;
        font-weight: 500;
      }
      .ac-subtitle {
        margin: 2px 0 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        line-height: 20px;
      }
      .ac-back {
        flex: none;
        height: 28px;
        padding: 0 10px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 13px;
        line-height: 20px;
        white-space: nowrap;
        cursor: pointer;
      }
      .ac-back:hover {
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
      }
      .ac-toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 18px 0;
      }
      .ac-search {
        display: flex;
        flex: 1;
        align-items: center;
        gap: 8px;
        min-width: 0;
        height: 36px;
        padding: 0 10px;
        border: 0.5px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        color: var(--dsw-alias-label-secondary);
        transition: border-color 0.15s;
      }
      .ac-search:hover { border-color: var(--dsw-alias-border-l2); }
      .ac-search:focus-within { border-color: var(--dsw-alias-brand-primary); }
      .ac-search input {
        flex: 1;
        min-width: 0;
        height: 100%;
        padding: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 14px;
      }
      .ac-search input:focus-visible { outline: none; }
      .ac-search input::placeholder {
        color: var(--dsw-alias-label-secondary);
        opacity: 0.85;
      }
      .ac-search input::-webkit-search-cancel-button { display: none; }
      .ac-search-clear {
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        cursor: pointer;
      }
      .ac-search-clear:hover {
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
      }
      .ac-stats {
        display: flex;
        flex: none;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 14px;
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        line-height: 20px;
        white-space: nowrap;
      }
      .ac-hint {
        margin: 0 0 14px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
      }
      .ac-hint-error { color: var(--dsw-alias-state-error-primary); }
      .ac-error {
        margin: 0 0 14px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-state-error-primary);
        font-size: 13px;
        line-height: 20px;
        overflow-wrap: anywhere;
      }
      .ac-status {
        padding: 40px 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        text-align: center;
      }
      .ac-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 56px 20px;
        color: var(--dsw-alias-label-secondary);
        text-align: center;
      }
      .ac-empty-glyph {
        margin-bottom: 12px;
        color: var(--dsw-alias-label-secondary);
        opacity: 0.75;
      }
      .ac-empty h2 {
        margin: 0 0 8px;
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        line-height: 22px;
        font-weight: 500;
      }
      .ac-empty p {
        max-width: 420px;
        margin: 0;
        font-size: 13px;
        line-height: 20px;
      }
      .ac-groups {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-bottom: 8px;
      }
      .ac-group {
        overflow: hidden;
        border: 0.5px solid var(--dsw-alias-border-l1);
        border-radius: 16px;
        background: var(--dsw-alias-bg-layer-1);
      }
      .ac-group-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 11px 14px;
        border-bottom: 0.5px solid var(--dsw-alias-border-l1);
        color: var(--dsw-alias-label-secondary);
      }
      .ac-group-head h2 {
        flex: 1;
        min-width: 0;
        margin: 0;
        overflow: hidden;
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        line-height: 20px;
        font-weight: 500;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ac-group-count {
        flex: none;
        margin-left: auto;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
      }
      .ac-rows {
        margin: 0;
        padding: 4px;
        list-style: none;
      }
      .ac-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 8px 10px;
        border-radius: 10px;
      }
      .ac-row:hover { background: var(--dsw-alias-bg-layer-2); }
      .ac-row-main { flex: 1; min-width: 0; }
      .ac-row-title {
        display: block;
        overflow: hidden;
        font-size: 14px;
        line-height: 22px;
        font-weight: 500;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ac-row-title-missing {
        color: var(--dsw-alias-label-secondary);
        font-weight: 400;
        font-style: italic;
      }
      .ac-row-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 10px;
        margin-top: 1px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
      }
      .ac-row-id {
        font-variant-numeric: tabular-nums;
        opacity: 0.8;
      }
      .ac-row-size {
        color: var(--dsw-alias-label-secondary);
        font-variant-numeric: tabular-nums;
        opacity: 0.9;
      }
      .ac-row-actions {
        display: flex;
        flex: none;
        align-items: center;
        gap: 6px;
      }
      .ac-button {
        height: 28px;
        padding: 0 10px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        line-height: 20px;
        white-space: nowrap;
        cursor: pointer;
      }
      .ac-button:hover:not(:disabled) {
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
      }
      .ac-button-primary {
        border: 0.5px solid var(--dsw-alias-brand-primary);
        color: var(--dsw-alias-brand-primary);
      }
      .ac-button-danger {
        border: 0.5px solid var(--dsw-alias-state-error-primary);
        color: var(--dsw-alias-state-error-primary);
      }
      .ac-button-danger:hover:not(:disabled) {
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-state-error-primary);
      }
      .ac-button:disabled {
        opacity: 0.55;
        cursor: default;
      }
      .ac-notice {
        margin: 0 0 14px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-state-success-primary);
        font-size: 13px;
        line-height: 20px;
        overflow-wrap: anywhere;
      }
      .ac-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 38%, transparent);
      }
      .ac-modal {
        box-sizing: border-box;
        width: min(440px, 100%);
        max-height: min(80vh, 640px);
        padding: 20px;
        overflow: auto;
        border: 0.5px solid var(--dsw-alias-border-l1);
        border-radius: 16px;
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary);
        box-shadow: 0 16px 48px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);
      }
      .ac-modal h2 {
        margin: 0 0 8px;
        font-size: 16px;
        line-height: 24px;
        font-weight: 500;
      }
      .ac-modal-body {
        margin: 0 0 14px;
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        line-height: 20px;
      }
      .ac-modal-subject {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 0 16px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
      }
      .ac-modal-title {
        font-size: 13px;
        line-height: 20px;
        font-weight: 500;
        overflow-wrap: anywhere;
      }
      .ac-modal-size {
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
        font-variant-numeric: tabular-nums;
      }
      .ac-modal-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }
      .ac-modal-actions .ac-button {
        height: 32px;
        font-size: 13px;
      }
      .ac-page :focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: 2px;
      }
      @media (max-width: 720px) {
        .ac-heading { padding-top: 20px; }
        .ac-toolbar { flex-wrap: wrap; }
        .ac-stats { width: 100%; }
        .ac-row { flex-wrap: wrap; gap: 8px; }
        .ac-row-actions { width: 100%; justify-content: flex-end; }
        .ac-modal-backdrop { padding: 16px; }
        .ac-modal { padding: 16px; }
      }
    `;

    const WHEN_FORMAT = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    function ArchiveGlyph({ size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { display: 'block' },
      },
      h('path', {
        d: 'M2.5 4.25h11a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-.75.75h-11A.75.75 0 0 1 1.75 7V5a.75.75 0 0 1 .75-.75Z',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M3.25 7.75h9.5v6a1.25 1.25 0 0 1-1.25 1.25H4.5a1.25 1.25 0 0 1-1.25-1.25v-6Z',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M6.25 9.5h3.5',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinecap: 'round',
      }));
    }

    function SearchGlyph() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { flex: 'none', display: 'block' },
      },
      h('circle', { cx: 7, cy: 7, r: 4.25, stroke: 'currentColor', strokeWidth: 1.2 }),
      h('path', { d: 'm10.25 10.25 3 3', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }));
    }

    function FolderGlyph() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { flex: 'none', display: 'block' },
      },
      h('path', {
        d: 'M2 4.25A1.25 1.25 0 0 1 3.25 3h2.4c.33 0 .64.13.88.37l.85.85h4.37A1.25 1.25 0 0 1 13 5.47v5.28A1.25 1.25 0 0 1 11.75 12h-8.5A1.25 1.25 0 0 1 2 10.75v-6.5Z',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinejoin: 'round',
      }));
    }

    function CloseGlyph() {
      return h('svg', {
        width: 12,
        height: 12,
        viewBox: '0 0 12 12',
        fill: 'none',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { display: 'block' },
      },
      h('path', {
        d: 'm3 3 6 6M9 3 3 9',
        stroke: 'currentColor',
        strokeWidth: 1.2,
        strokeLinecap: 'round',
      }));
    }

    function formatWhen(updatedAt, t) {
      if (!updatedAt) return t('unknownDate');
      const date = new Date(updatedAt);
      return Number.isNaN(date.getTime()) ? t('unknownDate') : WHEN_FORMAT.format(date);
    }

    function formatBytes(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return null;
      if (bytes < 1024) return `${bytes} B`;
      const units = ['KB', 'MB', 'GB', 'TB'];
      let value = bytes / 1024;
      let unit = 0;
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
      }
      return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
    }

    function apiUrl(suffix = '') {
      return new URL(`/api/archived-conversations${suffix}`, document.baseURI).toString();
    }

    function messageOf(error) {
      return error instanceof Error ? error.message : String(error);
    }

    function shortSessionId(id) {
      const value = id.startsWith('session-') ? id.slice('session-'.length) : id;
      return value.slice(0, 8);
    }

    function rowsFor(ids, byId) {
      const rows = ids.map((id) => {
        const summary = byId[id];
        return {
          id,
          title: summary === undefined ? '' : (summary.displayTitle || summary.title || ''),
          updatedAt: summary === undefined ? 0 : (summary.updatedAt || 0),
          missing: summary === undefined,
        };
      });
      rows.sort((left, right) => (
        right.updatedAt - left.updatedAt
        || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
      ));
      return rows;
    }

    function buildGroups(workspaceState, sessionState, removedIds) {
      const archived = workspaceState?.archivedSessionIds ?? [];
      const items = workspaceState?.items ?? [];
      const byId = sessionState?.byId ?? {};
      const removed = removedIds ?? new Set();
      const archivedSet = new Set(archived);
      const placed = new Set();
      const groups = [];
      for (const workspace of items) {
        const ids = [];
        for (const id of workspace.sessionIds) {
          if (!archivedSet.has(id) || placed.has(id) || removed.has(id)) continue;
          placed.add(id);
          ids.push(id);
        }
        if (ids.length === 0) continue;
        groups.push({
          key: workspace.workspaceId,
          title: workspace.title,
          path: workspace.path,
          rows: rowsFor(ids, byId),
        });
      }
      const rest = archived.filter((id) => !placed.has(id) && !removed.has(id));
      if (rest.length > 0) {
        groups.push({ key: UNGROUPED, title: '', path: null, rows: rowsFor(rest, byId) });
      }
      return groups;
    }

    function filterGroups(groups, query) {
      const needle = query.trim().toLowerCase();
      if (needle === '') return groups;
      return groups.flatMap((group) => {
        const groupMatches = (group.title || '').toLowerCase().includes(needle)
          || (group.path || '').toLowerCase().includes(needle);
        const rows = groupMatches
          ? group.rows
          : group.rows.filter((row) => (
            row.id.toLowerCase().includes(needle)
            || (row.title || '').toLowerCase().includes(needle)
          ));
        return rows.length === 0 ? [] : [{ ...group, rows }];
      });
    }

    function EmptyState({ title, body }) {
      return h('div', { className: 'ac-empty', role: 'status' },
        h('div', { className: 'ac-empty-glyph' }, h(ArchiveGlyph, { size: 24 })),
        h('h2', null, title),
        h('p', null, body));
    }

    function ArchivedPage(props) {
      const {
        t, useWorkspaces, useSessions, restoreSession, openSession, refreshSessions, backToConversation,
      } = props;
      const workspaceState = useWorkspaces((state) => state);
      const sessionState = useSessions((state) => state);
      const [query, setQuery] = useState('');
      const [busyId, setBusyId] = useState(null);
      const [error, setError] = useState(null);
      const [removedIds, setRemovedIds] = useState(() => new Set());
      const [sizes, setSizes] = useState({
        status: 'idle', byId: {}, totalBytes: 0, error: null,
      });
      const [confirming, setConfirming] = useState(null);
      const [deleting, setDeleting] = useState(false);
      const [deleteError, setDeleteError] = useState(null);
      const [notice, setNotice] = useState(null);
      const cancelRef = useRef(null);

      const archivedIds = workspaceState.archivedSessionIds ?? [];
      const archivedKey = archivedIds.join('\u0000');

      useEffect(() => {
        if (workspaceState.phase !== 'ready') return undefined;
        if (archivedIds.length === 0) {
          setSizes({ status: 'ready', byId: {}, totalBytes: 0, error: null });
          return undefined;
        }
        const controller = new AbortController();
        setSizes((previous) => ({ ...previous, status: 'loading', error: null }));
        fetch(apiUrl(), { credentials: 'same-origin', signal: controller.signal })
          .then(async (response) => {
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
            return body;
          })
          .then((body) => {
            if (controller.signal.aborted) return;
            const byId = {};
            for (const session of body.sessions ?? []) byId[session.id] = session;
            setSizes({
              status: 'ready',
              byId,
              totalBytes: typeof body.totalBytes === 'number' ? body.totalBytes : 0,
              error: null,
            });
          })
          .catch((reason) => {
            if (controller.signal.aborted) return;
            setSizes({ status: 'error', byId: {}, totalBytes: 0, error: messageOf(reason) });
          });
        return () => controller.abort();
        // The key is the archive-set content; the array identity may churn.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [archivedKey, workspaceState.phase]);

      useEffect(() => {
        if (confirming === null) return undefined;
        cancelRef.current?.focus();
        return undefined;
      }, [confirming]);

      useEffect(() => {
        if (notice === null) return undefined;
        const timer = window.setTimeout(() => setNotice(null), 6000);
        return () => window.clearTimeout(timer);
      }, [notice]);

      const groups = useMemo(
        () => buildGroups(workspaceState, sessionState, removedIds),
        [workspaceState, sessionState, removedIds],
      );
      const filtered = useMemo(() => filterGroups(groups, query), [groups, query]);
      const total = groups.reduce((count, group) => count + group.rows.length, 0);
      const shown = filtered.reduce((count, group) => count + group.rows.length, 0);
      const pendingWorkspaces = workspaceState.phase !== 'ready' && total === 0;
      const pendingDetails = sessionState.phase === 'pending' && total > 0;

      const run = (id, operation, prefix) => {
        if (busyId !== null) return;
        setBusyId(id);
        setError(null);
        operation(id)
          .then(() => {})
          .catch((reason) => {
            setError(`${prefix}${messageOf(reason)}`);
          })
          .finally(() => { setBusyId(null); });
      };
      const restore = (id) => run(id, restoreSession, t('errorRestore'));
      const open = (id) => run(id, async (sessionId) => {
        await restoreSession(sessionId);
        openSession(sessionId);
      }, t('errorOpen'));

      const sizeText = (id) => {
        const text = formatBytes(sizes.byId[id]?.sizeBytes);
        if (text !== null) return text;
        return sizes.status === 'loading' ? t('sizeLoading') : t('sizeUnknown');
      };
      const totalSizeText = sizes.status === 'ready'
        ? (formatBytes(sizes.totalBytes) ?? '0 B')
        : sizes.status === 'loading' ? t('sizeLoading') : t('sizeUnknown');

      const closeConfirm = () => {
        if (deleting) return;
        setConfirming(null);
        setDeleteError(null);
      };
      const confirmDelete = async () => {
        if (confirming === null || deleting) return;
        setDeleting(true);
        setDeleteError(null);
        try {
          const response = await fetch(apiUrl('/delete'), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId: confirming.id }),
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          setRemovedIds((previous) => {
            const next = new Set(previous);
            next.add(confirming.id);
            return next;
          });
          setConfirming(null);
          if (body.unarchived === false) setNotice(t('deletePartial'));
          else if (body.missing === true) setNotice(t('deleteMissing'));
          else setNotice(t(body.trashMode === 'system' ? 'deleteSuccessSystem' : 'deleteSuccessFolder'));
          if (typeof refreshSessions === 'function') {
            try {
              await refreshSessions();
            } catch (reason) {
              console.warn('archived-conversations: session refresh failed after delete', reason);
            }
          }
        } catch (reason) {
          setDeleteError(`${t('removeFailed')}${messageOf(reason)}`);
        } finally {
          setDeleting(false);
        }
      };

      let content;
      if (pendingWorkspaces) {
        content = h('div', { className: 'ac-status', role: 'status' }, t('loading'));
      } else if (total === 0) {
        content = h(EmptyState, { title: t('emptyTitle'), body: t('emptyBody') });
      } else if (shown === 0) {
        content = h(EmptyState, { title: t('noMatchesTitle'), body: t('noMatchesBody') });
      } else {
        content = h('div', { className: 'ac-groups' }, filtered.map((group, index) => {
          const headingId = `ac-group-${index}`;
          return h('section', {
            className: 'ac-group',
            key: group.key,
            'aria-labelledby': headingId,
          },
          h('div', { className: 'ac-group-head' },
            h(FolderGlyph),
            h('h2', { id: headingId, title: group.path || undefined }, group.title || t('ungrouped')),
            h('span', { className: 'ac-group-count' }, `${group.rows.length} ${t('items')}`)),
          h('ul', { className: 'ac-rows' }, group.rows.map((row) => h('li', {
            className: 'ac-row',
            key: row.id,
          },
          h('div', { className: 'ac-row-main' },
            h('span', {
              className: `ac-row-title${row.missing ? ' ac-row-title-missing' : ''}`,
              title: row.id,
            }, row.missing ? t('missingTitle') : (row.title || t('untitled'))),
            h('div', { className: 'ac-row-meta' },
              h('time', {
                dateTime: row.updatedAt > 0 ? new Date(row.updatedAt).toISOString() : undefined,
              }, formatWhen(row.updatedAt, t)),
              h('span', { className: 'ac-row-size', title: t('sizeLabel') }, sizeText(row.id)),
              h('span', { className: 'ac-row-id', title: row.id }, `#${shortSessionId(row.id)}`))),
          h('div', { className: 'ac-row-actions' },
            h('button', {
              type: 'button',
              className: 'ac-button',
              disabled: busyId !== null || deleting,
              onClick: () => restore(row.id),
            }, busyId === row.id ? t('restoring') : t('restore')),
            row.missing ? null : h('button', {
              type: 'button',
              className: 'ac-button ac-button-primary',
              disabled: busyId !== null || deleting,
              onClick: () => open(row.id),
            }, t('open')),
            h('button', {
              type: 'button',
              className: 'ac-button ac-button-danger',
              disabled: busyId !== null || deleting,
              onClick: () => {
                setDeleteError(null);
                setConfirming({
                  id: row.id,
                  title: row.missing ? t('missingTitle') : (row.title || t('untitled')),
                  sizeBytes: sizes.byId[row.id]?.sizeBytes ?? null,
                });
              },
            }, t('delete')))))));
        }));
      }

      return h('section', { className: 'ac-page', 'aria-label': t('title') },
        h('div', { className: 'ac-scroll' },
          h('div', { className: 'ac-content' },
            h('header', { className: 'ac-heading' },
              h('div', { className: 'ac-heading-copy' },
                h('h1', null, t('title')),
                h('p', { className: 'ac-subtitle' }, t('subtitle'))),
              h('button', {
                type: 'button',
                className: 'ac-back',
                onClick: backToConversation,
              }, t('back'))),
            h('div', { className: 'ac-toolbar' },
              h('div', { className: 'ac-search' },
                h(SearchGlyph),
                h('input', {
                  type: 'search',
                  value: query,
                  'aria-label': t('search'),
                  placeholder: t('searchPlaceholder'),
                  spellCheck: false,
                  onChange: (event) => { setQuery(event.target.value); },
                }),
                query !== '' && h('button', {
                  type: 'button',
                  className: 'ac-search-clear',
                  'aria-label': t('clear'),
                  onClick: () => { setQuery(''); },
                }, h(CloseGlyph))),
              h('div', { className: 'ac-stats' },
                h('span', null, `${total} ${t('count')}`),
                h('span', { title: t('sizeLabel') }, `${t('totalSize')} ${totalSizeText}`))),
            sizes.status === 'error' && total > 0 && h('p', {
              className: 'ac-hint ac-hint-error',
              role: 'status',
              title: sizes.error ?? undefined,
            }, t('sizeUnavailable')),
            workspaceState.state === 'error' && h('p', {
              className: 'ac-error',
              role: 'alert',
            }, `${t('failed')}${workspaceState.error?.message ? ` ${workspaceState.error.message}` : ''}`),
            error !== null && h('p', { className: 'ac-error', role: 'alert' }, error),
            notice !== null && h('p', { className: 'ac-notice', role: 'status' }, notice),
            pendingDetails && h('p', { className: 'ac-hint', role: 'status' }, t('loadingDetails')),
            content)),
        confirming !== null && h('div', {
          className: 'ac-modal-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) closeConfirm();
          },
        },
        h('div', {
          className: 'ac-modal',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'ac-delete-title',
          onKeyDown: (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeConfirm();
          },
        },
        h('h2', { id: 'ac-delete-title' }, t('deleteTitle')),
        h('p', { className: 'ac-modal-body' }, t('deleteBody')),
        h('div', { className: 'ac-modal-subject' },
          h('strong', { className: 'ac-modal-title' }, confirming.title),
          h('span', { className: 'ac-modal-size' }, formatBytes(confirming.sizeBytes) ?? t('sizeUnknown'))),
        deleteError !== null && h('p', { className: 'ac-error', role: 'alert' }, deleteError),
        h('div', { className: 'ac-modal-actions' },
          h('button', {
            ref: cancelRef,
            type: 'button',
            className: 'ac-button',
            disabled: deleting,
            onClick: closeConfirm,
          }, t('cancel')),
          h('button', {
            type: 'button',
            className: 'ac-button ac-button-danger',
            disabled: deleting,
            onClick: confirmDelete,
          }, deleting ? t('deleting') : t('deleteConfirm'))))));
    }

    function PanelIcon({ size }) {
      return h(ArchiveGlyph, { size: size || 16 });
    }

    /**
     * The shipped Workspace browser keeps its archived-visibility choice in a
     * private viewing store (`archivedFilter`). That store has no slot, so the
     * only plugin-level way to make this plugin the sole archive viewer is to
     * keep the choice on its default "hide" value. The slot ledger exposes the
     * browser's store seat, and that handle's `create()` returns the same live
     * instance the browser renders. Coercing the one action that writes the
     * field (and re-asserting it when a previously captured action reference
     * changes it) keeps archived rows out of the sidebar, its search, and its
     * archived-only view while this plugin keeps its own archive list.
     */
    function installWorkspaceArchiveGate(ctx) {
      let active = null;

      const openArchivePanel = () => {
        try {
          ctx.layout.selectPanel(PANEL_ID);
        } catch (error) {
          console.warn('archived-conversations: could not open the archive panel', error);
        }
      };

      const restore = () => {
        if (active === null) return;
        if (active.patched !== null
          && active.instance.actions.setArchivedFilter === active.patched) {
          try {
            active.instance.actions.setArchivedFilter = active.original;
          } catch (error) {
            console.warn('archived-conversations: could not restore workspace archive filter', error);
          }
        }
        try {
          active.unsubscribe();
        } catch (error) {
          console.warn('archived-conversations: could not release workspace archive gate', error);
        }
        active = null;
      };

      const sync = () => {
        const entries = typeof ctx.slots.entriesOfSlot === 'function'
          ? ctx.slots.entriesOfSlot('sidebar.workspaces')
          : ctx.slots.entries('sidebar.workspaces');
        const entry = entries.find((candidate) => (
          candidate.store !== undefined
          && typeof candidate.store.create === 'function'
        ));
        if (entry === undefined) return;

        let instance;
        try {
          instance = entry.store.create();
        } catch (error) {
          console.warn('archived-conversations: could not open workspace view store', error);
          return;
        }
        if (typeof instance?.actions?.setArchivedFilter !== 'function') return;
        if (active !== null
          && active.instance === instance
          && (active.patched === null
            || instance.actions.setArchivedFilter === active.patched)) return;

        restore();
        const original = instance.actions.setArchivedFilter;
        const hide = () => {
          try {
            original('default');
          } catch (error) {
            console.warn('archived-conversations: could not hide workspace archives', error);
          }
        };
        const patched = (filter) => {
          if (active === null || active.patched !== patched) {
            try {
              original(filter);
            } catch (error) {
              console.warn('archived-conversations: could not update workspace archive filter', error);
            }
            return;
          }
          // The workspace's own "show/only archived" affordances route to the
          // plugin panel instead of revealing archived rows in the sidebar.
          if (filter === 'show' || filter === 'only') openArchivePanel();
          hide();
        };
        let installedPatch = null;
        try {
          instance.actions.setArchivedFilter = patched;
          installedPatch = patched;
        } catch (error) {
          console.warn('archived-conversations: using the state fallback for workspace archives', error);
        }
        hide();
        const unsubscribe = typeof instance.subscribe === 'function'
          ? instance.subscribe(() => {
            const state = instance.getSnapshot();
            if ((state?.archivedFilter ?? 'default') !== 'default') {
              // A previously captured action reference can bypass the patched
              // action; hide again and route that request to the plugin panel.
              hide();
              openArchivePanel();
            }
          })
          : () => {};
        active = { instance, original, patched: installedPatch, unsubscribe };
      };

      sync();
      const offMutate = typeof ctx.slots.onMutate === 'function'
        ? ctx.slots.onMutate((key) => { if (key === 'sidebar.workspaces') sync(); })
        : () => {};
      const offSubscribe = typeof ctx.slots.subscribe === 'function'
        ? ctx.slots.subscribe('sidebar.workspaces', sync)
        : () => {};
      return () => {
        offMutate();
        offSubscribe();
        restore();
      };
    }

    function apply(ctx) {
      ctx.effect(
        () => ctx.locale.register(NS, { en, zh }),
        'archived-conversations: dictionaries',
      );
      const t = ctx.locale.bind(NS);
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-dsh-plugin', PANEL_ID);
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => { style.remove(); };
      }, 'archived-conversations: styles');

      ctx.effect(
        () => {
          try {
            return installWorkspaceArchiveGate(ctx);
          } catch (error) {
            console.warn('archived-conversations: workspace archive gate disabled', error);
            return () => {};
          }
        },
        'archived-conversations: workspace archive gate',
      );

      const pageInjected = () => ({
        restoreSession: (sessionId) => ctx.workspaces.unarchiveSession(sessionId),
        openSession: (sessionId) => { ctx.uiWorkspace.openSession(sessionId); },
        refreshSessions: () => ctx.sessions.refresh(),
        backToConversation: () => { ctx.layout.selectPanel(null); },
      });

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: pageInjected,
      }, ArchivedPage));

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => t('nav'),
      }, PanelIcon));
    }

    return {
      inject: ['slots', 'locale', 'workspaces', 'sessions', 'uiWorkspace', 'layout'],
      apply,
    };
  },
});
