import { Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

/** Renders a showcase content block by type — never uses dangerouslySetInnerHTML. */
export const ArticleBlockView = ({ block, resolveImageUrl }) => {
  const type = String(block?.type || '').toUpperCase();
  const text = block?.text || '';

  if (type === 'HEADING') {
    return <Title level={3} style={{ marginTop: 28 }}>{text}</Title>;
  }
  if (type === 'QUOTE') {
    return (
      <blockquote
        style={{
          margin: '20px 0',
          padding: '12px 18px',
          borderLeft: '4px solid #1677ff',
          background: 'rgba(22,119,255,0.06)',
          fontStyle: 'italic',
          color: '#334155',
        }}
      >
        <Text>{text}</Text>
      </blockquote>
    );
  }
  if (type === 'IMAGE') {
    const src = resolveImageUrl?.(block) || block?.imageUrl;
    if (!src) return null;
    return (
      <figure style={{ margin: '24px 0' }}>
        <img
          src={src}
          alt={text || 'Illustration'}
          style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 12 }}
        />
        {text ? (
          <figcaption style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>{text}</figcaption>
        ) : null}
      </figure>
    );
  }
  return (
    <Paragraph style={{ fontSize: 16, lineHeight: 1.75, color: '#1e293b' }}>
      {text}
    </Paragraph>
  );
};

export default ArticleBlockView;
