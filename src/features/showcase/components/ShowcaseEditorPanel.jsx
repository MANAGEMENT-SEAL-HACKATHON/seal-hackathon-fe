import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { ArrowDown, ArrowUp, FilePlus2, Plus, Trash2, Upload as UploadIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArticleBlockView } from './ArticleBlockView';
import { absoluteApiUrl, showcaseService } from '../services/showcase.service';
import { ROUTES } from '../../../shared/constants/routes';

const { Text, Title } = Typography;
const { TextArea } = Input;

const BLOCK_TYPES = [
  { value: 'HEADING', label: 'Tiêu đề' },
  { value: 'PARAGRAPH', label: 'Đoạn văn' },
  { value: 'QUOTE', label: 'Trích dẫn' },
  { value: 'IMAGE', label: 'Ảnh' },
];

const emptyBlock = (type = 'PARAGRAPH') => ({
  type,
  sortOrder: 0,
  text: '',
  imageKey: null,
});

const ShowcaseEditorPanel = ({ hackathonId }) => {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [hof, setHof] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, hofList] = await Promise.all([
        showcaseService.listArticlesByHackathon(hackathonId),
        showcaseService.listHofByHackathon(hackathonId),
      ]);
      setArticles(Array.isArray(list) ? list : []);
      setHof(Array.isArray(hofList) ? hofList : []);
      // Do not overwrite draft here — preserves unsaved blocks after cover upload / list refresh
    } catch (err) {
      message.error(err?.message || 'Không tải được bài viết');
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sync selected article metadata (status) from list without wiping local blocks
  useEffect(() => {
    if (!selectedId || !articles.length) return;
    const found = articles.find((a) => a.id === selectedId);
    if (!found) return;
    setDraft((prev) => {
      if (!prev || prev.id !== selectedId) return prev;
      return {
        ...prev,
        status: found.status ?? prev.status,
        publishedAt: found.publishedAt ?? prev.publishedAt,
        coverUrl: prev.coverUrl || found.coverUrl,
        coverImageKey: prev.coverImageKey || found.coverImageKey,
      };
    });
  }, [articles, selectedId]);

  const selectArticle = (article) => {
    setSelectedId(article.id);
    setDraft({
      ...article,
      blocks: Array.isArray(article.blocks) ? article.blocks.map((b) => ({ ...b })) : [],
    });
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const created = await showcaseService.generateDraft(hackathonId);
      message.success('Đã tạo nháp từ kết quả');
      setSelectedId(created.id);
      setDraft(created);
      await refresh();
    } catch (err) {
      message.error(err?.message || 'Không tạo được nháp — cần có giải Nhất / bảng vàng');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlank = async () => {
    setSaving(true);
    try {
      const created = await showcaseService.createArticle(hackathonId, {
        slug: `hackathon-${hackathonId}-story-${Date.now()}`,
        title: 'Bài viết mới',
        summary: '',
        blocks: [emptyBlock('HEADING'), emptyBlock('PARAGRAPH')],
      });
      message.success('Đã tạo bài nháp');
      setSelectedId(created.id);
      setDraft(created);
      await refresh();
    } catch (err) {
      message.error(err?.message || 'Không tạo được bài viết');
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (index, patch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const blocks = [...(prev.blocks || [])];
      blocks[index] = { ...blocks[index], ...patch };
      return { ...prev, blocks };
    });
  };

  const moveBlock = (index, dir) => {
    setDraft((prev) => {
      if (!prev?.blocks) return prev;
      const blocks = [...prev.blocks];
      const next = index + dir;
      if (next < 0 || next >= blocks.length) return prev;
      [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
      return {
        ...prev,
        blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
      };
    });
  };

  const removeBlock = (index) => {
    setDraft((prev) => {
      if (!prev?.blocks) return prev;
      const blocks = prev.blocks.filter((_, i) => i !== index).map((b, i) => ({ ...b, sortOrder: i }));
      return { ...prev, blocks };
    });
  };

  const addBlock = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const blocks = [...(prev.blocks || []), { ...emptyBlock(), sortOrder: (prev.blocks || []).length }];
      return { ...prev, blocks };
    });
  };

  const handleSave = async () => {
    if (!draft?.id) return;

    const doSave = async () => {
      setSaving(true);
      try {
        const updated = await showcaseService.updateArticle(draft.id, {
          slug: draft.slug,
          title: draft.title,
          summary: draft.summary,
          blocks: (draft.blocks || []).map((b, i) => ({
            type: b.type,
            sortOrder: i,
            text: b.text,
            imageKey: b.imageKey || null,
          })),
        });
        setDraft(updated);
        message.success('Đã lưu bài viết');
        await refresh();
      } catch (err) {
        message.error(err?.message || 'Lưu thất bại');
      } finally {
        setSaving(false);
      }
    };

    const serverArticle = articles.find((a) => a.id === draft.id);
    const serverHadBlocks = Array.isArray(serverArticle?.blocks) && serverArticle.blocks.length > 0;
    const draftBlocksEmpty = !draft.blocks || draft.blocks.length === 0;
    if (draftBlocksEmpty && serverHadBlocks) {
      Modal.confirm({
        title: 'Xóa toàn bộ nội dung?',
        content: 'Bài viết trên máy chủ đang có khối nội dung. Lưu với danh sách trống sẽ xóa hết. Bạn chắc chắn?',
        okText: 'Vẫn lưu (xóa nội dung)',
        okButtonProps: { danger: true },
        cancelText: 'Hủy',
        onOk: doSave,
      });
      return;
    }
    await doSave();
  };

  const handlePublishToggle = async () => {
    if (!draft?.id) return;
    setSaving(true);
    try {
      const updated =
        String(draft.status).toUpperCase() === 'PUBLISHED'
          ? await showcaseService.unpublishArticle(draft.id)
          : await showcaseService.publishArticle(draft.id);
      setDraft(updated);
      message.success(String(updated.status).toUpperCase() === 'PUBLISHED' ? 'Đã xuất bản' : 'Đã gỡ xuất bản');
      await refresh();
    } catch (err) {
      message.error(err?.message || 'Không đổi được trạng thái');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file) => {
    if (!draft?.id) return false;
    try {
      const updated = await showcaseService.uploadCover(draft.id, file);
      setDraft((prev) => ({
        ...prev,
        coverUrl: updated.coverUrl ?? updated.cover_url ?? prev?.coverUrl,
        coverImageKey: updated.coverImageKey ?? updated.cover_image_key ?? prev?.coverImageKey,
      }));
      message.success('Đã cập nhật ảnh bìa');
    } catch (err) {
      message.error(err?.message || 'Upload ảnh bìa thất bại');
    }
    return false;
  };

  const handleBlockImage = async (index, file) => {
    if (!draft?.id) return false;
    try {
      const res = await showcaseService.uploadBlockImage(draft.id, file);
      updateBlock(index, { imageKey: res.imageKey, type: 'IMAGE' });
      message.success('Đã tải ảnh khối');
    } catch (err) {
      message.error(err?.message || 'Upload ảnh thất bại');
    }
    return false;
  };

  const isPublished = String(draft?.status || '').toUpperCase() === 'PUBLISHED';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 16 }}>
      <Alert
        type="info"
        showIcon
        message="Soạn bài vinh danh dạng khối (không markdown)"
        description="Tạo nháp từ quán quân, sắp xếp khối nội dung, rồi xuất bản để hiện trên trang công khai."
      />

      <Card size="small" title="Bảng vàng (snapshot)">
        {hof.length === 0 ? (
          <Empty description="Chưa có bản ghi — sẽ tạo khi chốt sổ (hoặc backfill)" />
        ) : (
          hof.map((e) => {
            const cover = e.coverUrl || e.cover_url;
            const hasArticle = Boolean(e.articleSlug || e.article_slug);
            return (
              <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: cover
                      ? `center / cover no-repeat url(${absoluteApiUrl(cover)})`
                      : 'linear-gradient(135deg, #1677ff, #F37021)',
                  }}
                />
                <div>
                  <Text strong>{e.teamName}</Text>
                  <Text type="secondary"> — {e.memberNames || '—'}</Text>
                  {e.prizeName ? (
                    <div>
                      <Text style={{ color: '#1677ff', fontWeight: 600 }}>
                        {e.prizeName}
                        {e.prizeValue ? ` · ${e.prizeValue}` : ''}
                      </Text>
                    </div>
                  ) : null}
                  {!hasArticle ? (
                    <Text type="warning" style={{ display: 'block', fontSize: 12 }}>
                      Chưa có bài viết vinh danh cho mùa này — hãy soạn và xuất bản bên dưới.
                    </Text>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div style={{ marginTop: 12 }}>
          <Link to={ROUTES.PUBLIC_HALL_OF_FAME} target="_blank">
            Xem trang bảng vàng công khai
          </Link>
        </div>
      </Card>

      <Space wrap>
        <Button type="primary" icon={<FilePlus2 size={16} />} loading={saving} onClick={handleGenerate}>
          Tạo nháp từ kết quả
        </Button>
        <Button icon={<Plus size={16} />} loading={saving} onClick={handleCreateBlank}>
          Tạo bài trống
        </Button>
      </Space>

      <Card loading={loading} title="Danh sách bài viết">
        {articles.length === 0 ? (
          <Empty description="Chưa có bài viết" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {articles.map((a) => (
              <Button
                key={a.id}
                type={selectedId === a.id ? 'primary' : 'default'}
                block
                onClick={() => selectArticle(a)}
                style={{ textAlign: 'left', height: 'auto', padding: '10px 14px' }}
              >
                <Space>
                  <Text strong style={{ color: 'inherit' }}>{a.title}</Text>
                  <Tag color={String(a.status).toUpperCase() === 'PUBLISHED' ? 'green' : 'default'}>
                    {a.status}
                  </Tag>
                </Space>
              </Button>
            ))}
          </Space>
        )}
      </Card>

      {draft ? (
        <Card
          title={
            <Space>
              <span>Soạn thảo</span>
              <Tag color={isPublished ? 'green' : 'orange'}>{draft.status}</Tag>
            </Space>
          }
          extra={
            <Space wrap>
              <Upload accept="image/*" showUploadList={false} beforeUpload={handleCoverUpload}>
                <Button icon={<UploadIcon size={14} />}>Ảnh bìa</Button>
              </Upload>
              <Button loading={saving} onClick={handleSave}>
                Lưu
              </Button>
              <Button type="primary" loading={saving} onClick={handlePublishToggle}>
                {isPublished ? 'Gỡ xuất bản' : 'Xuất bản'}
              </Button>
              {isPublished ? (
                <Link to={ROUTES.PUBLIC_ARTICLE.replace(':slug', draft.slug)} target="_blank">
                  Xem công khai
                </Link>
              ) : null}
            </Space>
          }
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div>
              <Text strong>Slug</Text>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <Text strong>Tiêu đề</Text>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <Text strong>Tóm tắt</Text>
              <TextArea
                rows={2}
                value={draft.summary || ''}
                onChange={(e) => setDraft((p) => ({ ...p, summary: e.target.value }))}
                style={{ marginTop: 6 }}
              />
            </div>
            {draft.coverUrl ? (
              <img
                src={absoluteApiUrl(draft.coverUrl)}
                alt="cover"
                style={{ maxWidth: 280, borderRadius: 8 }}
              />
            ) : null}

            <Title level={5} style={{ marginTop: 8 }}>
              Khối nội dung
            </Title>
            {(draft.blocks || []).map((block, index) => (
              <Card
                key={`${block.id || 'new'}-${index}`}
                size="small"
                title={
                  <Select
                    style={{ width: 160 }}
                    value={block.type}
                    options={BLOCK_TYPES}
                    onChange={(type) => updateBlock(index, { type })}
                  />
                }
                extra={
                  <Space>
                    <Button size="small" icon={<ArrowUp size={14} />} onClick={() => moveBlock(index, -1)} />
                    <Button size="small" icon={<ArrowDown size={14} />} onClick={() => moveBlock(index, 1)} />
                    <Button size="small" danger icon={<Trash2 size={14} />} onClick={() => removeBlock(index)} />
                  </Space>
                }
              >
                {String(block.type).toUpperCase() === 'IMAGE' ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => handleBlockImage(index, file)}>
                      <Button icon={<UploadIcon size={14} />}>Tải ảnh khối</Button>
                    </Upload>
                    <TextArea
                      rows={2}
                      placeholder="Chú thích ảnh (tùy chọn)"
                      value={block.text || ''}
                      onChange={(e) => updateBlock(index, { text: e.target.value })}
                    />
                    {block.imageKey ? <Text type="secondary">imageKey: {block.imageKey}</Text> : null}
                  </Space>
                ) : (
                  <TextArea
                    rows={String(block.type).toUpperCase() === 'HEADING' ? 2 : 4}
                    value={block.text || ''}
                    onChange={(e) => updateBlock(index, { text: e.target.value })}
                    placeholder="Nội dung khối…"
                  />
                )}
              </Card>
            ))}
            <Button icon={<Plus size={16} />} onClick={addBlock}>
              Thêm khối
            </Button>

            <Card type="inner" title="Xem trước">
              {(draft.blocks || []).map((block, index) => (
                <ArticleBlockView
                  key={`preview-${index}`}
                  block={block}
                  resolveImageUrl={(b) => (b.imageUrl ? absoluteApiUrl(b.imageUrl) : null)}
                />
              ))}
            </Card>
          </Space>
        </Card>
      ) : null}
    </Space>
  );
};

export default ShowcaseEditorPanel;
