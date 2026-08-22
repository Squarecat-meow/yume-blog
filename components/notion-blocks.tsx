import type { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';
import type { NotionBlock } from '@/types/notion';

function RichText({ richText }: { richText: RichTextItemResponse[] }) {
  return (
    <>
      {richText.map((t, i) => {
        let node: React.ReactNode = t.plain_text;

        if (t.annotations.code) {
          node = (
            <code className='rounded bg-slate-100 px-1 text-sm'>{node}</code>
          );
        }
        if (t.annotations.bold) node = <strong>{node}</strong>;
        if (t.annotations.italic) node = <em>{node}</em>;
        if (t.annotations.strikethrough) node = <s>{node}</s>;
        if (t.annotations.underline) node = <u>{node}</u>;
        if (t.href) {
          node = (
            <a
              href={t.href}
              target='_blank'
              rel='noreferrer'
              className='text-sky-600 underline'
            >
              {node}
            </a>
          );
        }

        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

type ListGroup = {
  kind: 'list';
  style: 'bulleted' | 'numbered';
  items: NotionBlock[];
};
type SingleGroup = { kind: 'single'; block: NotionBlock };

function groupBlocks(blocks: NotionBlock[]): (ListGroup | SingleGroup)[] {
  const groups: (ListGroup | SingleGroup)[] = [];

  for (const block of blocks) {
    const style =
      block.type === 'bulleted_list_item'
        ? 'bulleted'
        : block.type === 'numbered_list_item'
          ? 'numbered'
          : null;

    const last = groups[groups.length - 1];
    if (style && last?.kind === 'list' && last.style === style) {
      last.items.push(block);
    } else if (style) {
      groups.push({ kind: 'list', style, items: [block] });
    } else {
      groups.push({ kind: 'single', block });
    }
  }

  return groups;
}

function renderBlock(block: NotionBlock) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className='text-slate-700 leading-relaxed'>
          <RichText richText={block.paragraph.rich_text} />
        </p>
      );
    case 'heading_1':
      return (
        <h2 className='font-song text-3xl mt-8'>
          <RichText richText={block.heading_1.rich_text} />
        </h2>
      );
    case 'heading_2':
      return (
        <h3 className='font-song text-2xl mt-6'>
          <RichText richText={block.heading_2.rich_text} />
        </h3>
      );
    case 'heading_3':
      return (
        <h4 className='font-song text-xl mt-4'>
          <RichText richText={block.heading_3.rich_text} />
        </h4>
      );
    case 'quote':
      return (
        <blockquote className='border-l-2 border-slate-300 pl-4 italic text-slate-600'>
          <RichText richText={block.quote.rich_text} />
        </blockquote>
      );
    case 'to_do':
      return (
        <label className='flex items-start gap-2 text-slate-700'>
          <input
            type='checkbox'
            checked={block.to_do.checked}
            disabled
            className='mt-1'
          />
          <RichText richText={block.to_do.rich_text} />
        </label>
      );
    case 'callout':
      return (
        <div className='flex gap-3 rounded bg-slate-100 p-4 text-slate-700'>
          <span>
            {block.callout.icon?.type === 'emoji'
              ? block.callout.icon.emoji
              : '📌'}
          </span>
          <RichText richText={block.callout.rich_text} />
        </div>
      );
    case 'toggle':
      return (
        <details className='text-slate-700'>
          <summary className='cursor-pointer font-song'>
            <RichText richText={block.toggle.rich_text} />
          </summary>
          <div className='mt-2 pl-4'>
            <NotionBlocks blocks={block.children} />
          </div>
        </details>
      );
    case 'table': {
      const rows = block.children.filter(
        (child): child is NotionBlock & { type: 'table_row' } =>
          child.type === 'table_row',
      );

      return (
        <table className='w-full border-collapse text-slate-700'>
          <tbody>
            {rows.map((row, rowIndex) => {
              const isHeaderRow =
                block.table.has_column_header && rowIndex === 0;
              const Cell = isHeaderRow ? 'th' : 'td';

              return (
                <tr key={row.id}>
                  {row.table_row.cells.map((cell, cellIndex) => (
                    <Cell
                      key={cellIndex}
                      className='border border-slate-300 p-2 text-left'
                    >
                      <RichText richText={cell} />
                    </Cell>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    case 'code':
      return (
        <pre className='rounded bg-slate-100 p-4 overflow-x-auto text-sm'>
          <code>{block.code.rich_text.map((t) => t.plain_text).join('')}</code>
        </pre>
      );
    case 'image': {
      const src =
        block.image.type === 'external'
          ? block.image.external.url
          : block.image.file.url;
      const alt = block.image.caption.map((t) => t.plain_text).join('');
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} className='w-full rounded' />;
    }
    case 'divider':
      return <hr className='border-slate-300 my-8' />;
    default:
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[notion-blocks] 지원하지 않는 블록 타입: ${block.type}`);
      }
      return null;
  }
}

function renderListGroup(group: ListGroup, key: number) {
  const Tag = group.style === 'bulleted' ? 'ul' : 'ol';
  const className =
    group.style === 'bulleted'
      ? 'list-disc pl-6 space-y-1 text-slate-700'
      : 'list-decimal pl-6 space-y-1 text-slate-700';

  return (
    <Tag key={key} className={className}>
      {group.items.map((item) => {
        const richText =
          item.type === 'bulleted_list_item'
            ? item.bulleted_list_item.rich_text
            : item.type === 'numbered_list_item'
              ? item.numbered_list_item.rich_text
              : [];

        return (
          <li key={item.id}>
            <RichText richText={richText} />
            {item.children.length > 0 && (
              <NotionBlocks blocks={item.children} />
            )}
          </li>
        );
      })}
    </Tag>
  );
}

export default function NotionBlocks({ blocks }: { blocks: NotionBlock[] }) {
  const groups = groupBlocks(blocks);

  return (
    <div className='space-y-4'>
      {groups.map((group, i) =>
        group.kind === 'list' ? (
          renderListGroup(group, i)
        ) : (
          <div key={group.block.id}>
            {renderBlock(group.block)}
            {group.block.children.length > 0 &&
              group.block.type !== 'bulleted_list_item' &&
              group.block.type !== 'numbered_list_item' &&
              group.block.type !== 'toggle' &&
              group.block.type !== 'table' && (
                <div className='mt-2'>
                  <NotionBlocks blocks={group.block.children} />
                </div>
              )}
          </div>
        ),
      )}
    </div>
  );
}
