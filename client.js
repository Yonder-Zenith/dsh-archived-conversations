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
    const { useMemo, useState } = React;

    const NS = 'archived-conversations';
    const PANEL_ID = 'archived-conversations';
    const UNGROUPED = '__ungrouped__';

    const en = {
      nav: 'Archived conversations',
      title: 'Archived conversations',
      subtitle: 'Every archived conversation in one place. Restoring one returns it to the sidebar.',
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
      back: 'Back to conversation',
      errorRestore: 'Could not restore the conversation: ',
      errorOpen: 'Could not open the conversation: ',
    };

    const zh = {
      nav: '归档对话',
      title: '归档对话',
      subtitle: '集中查看所有已归档的对话。恢复后，它会回到侧边栏原来的位置。',
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
      .ac-count {
        flex: none;
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
      .ac-button:disabled {
        opacity: 0.55;
        cursor: default;
      }
      .ac-page :focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: 2px;
      }
      @media (max-width: 720px) {
        .ac-heading { padding-top: 20px; }
        .ac-toolbar { flex-wrap: wrap; }
        .ac-count { width: 100%; }
        .ac-row { flex-wrap: wrap; gap: 8px; }
        .ac-row-actions { width: 100%; justify-content: flex-end; }
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

    function buildGroups(workspaceState, sessionState) {
      const archived = workspaceState?.archivedSessionIds ?? [];
      const items = workspaceState?.items ?? [];
      const byId = sessionState?.byId ?? {};
      const archivedSet = new Set(archived);
      const placed = new Set();
      const groups = [];
      for (const workspace of items) {
        const ids = [];
        for (const id of workspace.sessionIds) {
          if (!archivedSet.has(id) || placed.has(id)) continue;
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
      const rest = archived.filter((id) => !placed.has(id));
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
        t, useWorkspaces, useSessions, restoreSession, openSession, backToConversation,
      } = props;
      const workspaceState = useWorkspaces((state) => state);
      const sessionState = useSessions((state) => state);
      const [query, setQuery] = useState('');
      const [busyId, setBusyId] = useState(null);
      const [error, setError] = useState(null);

      const groups = useMemo(
        () => buildGroups(workspaceState, sessionState),
        [workspaceState, sessionState],
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
            const detail = reason instanceof Error ? reason.message : String(reason);
            setError(`${prefix}${detail}`);
          })
          .finally(() => { setBusyId(null); });
      };
      const restore = (id) => run(id, restoreSession, t('errorRestore'));
      const open = (id) => run(id, async (sessionId) => {
        await restoreSession(sessionId);
        openSession(sessionId);
      }, t('errorOpen'));

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
              h('span', { className: 'ac-row-id', title: row.id }, `#${row.id.slice(0, 8)}`))),
          h('div', { className: 'ac-row-actions' },
            h('button', {
              type: 'button',
              className: 'ac-button',
              disabled: busyId !== null,
              onClick: () => restore(row.id),
            }, busyId === row.id ? t('restoring') : t('restore')),
            row.missing ? null : h('button', {
              type: 'button',
              className: 'ac-button ac-button-primary',
              disabled: busyId !== null,
              onClick: () => open(row.id),
            }, t('open')))))));
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
              h('span', { className: 'ac-count' }, `${total} ${t('count')}`)),
            workspaceState.state === 'error' && h('p', {
              className: 'ac-error',
              role: 'alert',
            }, `${t('failed')}${workspaceState.error?.message ? ` ${workspaceState.error.message}` : ''}`),
            error !== null && h('p', { className: 'ac-error', role: 'alert' }, error),
            pendingDetails && h('p', { className: 'ac-hint', role: 'status' }, t('loadingDetails')),
            content)));
    }

    function PanelIcon({ size }) {
      return h(ArchiveGlyph, { size: size || 16 });
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

      const pageInjected = () => ({
        restoreSession: (sessionId) => ctx.workspaces.unarchiveSession(sessionId),
        openSession: (sessionId) => { ctx.uiWorkspace.openSession(sessionId); },
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
