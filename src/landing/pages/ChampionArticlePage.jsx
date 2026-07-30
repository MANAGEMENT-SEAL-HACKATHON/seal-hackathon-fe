import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Spin, Typography } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { ArticleBlockView } from '../../features/showcase/components/ArticleBlockView';
import { absoluteApiUrl, showcaseService } from '../../features/showcase/services/showcase.service';
import { ROUTES } from '../../shared/constants/routes';

const { Title, Paragraph, Text } = Typography;

const ChampionArticlePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [article, setArticle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await showcaseService.getPublishedArticle(slug);
        if (!cancelled) setArticle(data);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Không tìm thấy bài viết');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: 64, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{ maxWidth: 640, margin: '48px auto', padding: 16 }}>
        <Alert type="error" showIcon message={error || 'Không tìm thấy bài viết'} />
        <Button style={{ marginTop: 16 }} onClick={() => navigate(ROUTES.PUBLIC_HALL_OF_FAME)}>
          Xem bảng vàng
        </Button>
      </div>
    );
  }

  const coverSrc = absoluteApiUrl(article.coverUrl);
  const blocks = Array.isArray(article.blocks) ? article.blocks : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 80% 0%, rgba(22,119,255,0.1), transparent 40%), #f8fafc',
        paddingBottom: 64,
      }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 18px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(ROUTES.LANDING)}>
            Trang chủ
          </Button>
          <Link to={ROUTES.PUBLIC_HALL_OF_FAME}>
            <Button>Bảng vàng</Button>
          </Link>
        </div>

        {coverSrc ? (
          <img
            src={coverSrc}
            alt={article.title}
            style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 18, marginBottom: 28 }}
          />
        ) : null}

        <Title level={1} style={{ marginBottom: 8 }}>
          {article.title}
        </Title>
        {article.publishedAt ? (
          <Text type="secondary">
            Xuất bản {new Date(article.publishedAt).toLocaleDateString('vi-VN')}
            {article.authorName ? ` · ${article.authorName}` : ''}
          </Text>
        ) : null}
        {article.summary ? (
          <Paragraph style={{ fontSize: 18, color: '#475569', marginTop: 16 }}>{article.summary}</Paragraph>
        ) : null}

        <div style={{ marginTop: 28 }}>
          {blocks.map((block) => (
            <ArticleBlockView
              key={block.id || `${block.type}-${block.sortOrder}`}
              block={block}
              resolveImageUrl={(b) => absoluteApiUrl(b.imageUrl)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChampionArticlePage;
