import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Avatar, Empty, List, Space, Spin, Tag, Typography } from 'antd';
import { GithubOutlined, StarOutlined } from '@ant-design/icons';
import { personBApi } from '../../../api/personB.api';

const { Text, Link } = Typography;

const shortSha = (sha) => (sha ? String(sha).slice(0, 7) : '—');

const formatCommitDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
};

/**
 * Repo header + commit timeline for a submission (FR-17 / Phase 7).
 * @param {{ submissionId: number|string, anonymous?: boolean, compact?: boolean }} props
 */
const GitHubRepoPanel = ({ submissionId, anonymous = false, compact = false }) => {
  const enabled = Boolean(submissionId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['submissionGithub', submissionId, anonymous],
    queryFn: () => personBApi.getSubmissionGithub(submissionId, { anonymous }),
    enabled,
    retry: false,
    staleTime: 60_000,
  });

  if (!enabled) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bài nộp" />;
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: compact ? 16 : 28 }}>
        <Spin tip="Đang tải thông tin GitHub…" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được thông tin GitHub"
        description={error?.response?.data?.error?.message || error?.message}
      />
    );
  }

  const rateLimited = Boolean(data?.rateLimited ?? data?.rate_limited);
  const missingToken = Boolean(data?.missingToken ?? data?.missing_token);
  const integrationEnabled = data?.enabled !== false;
  const unavailable = Boolean(data?.unavailable);
  const commits = Array.isArray(data?.commits) ? data.commits : [];
  const repoName = data?.repoFullName || data?.repo_full_name || data?.repoName || data?.repo_name;
  const language = data?.language;
  const stars = data?.stars;
  const description = data?.description;
  const htmlUrl = data?.htmlUrl || data?.html_url;
  const fetchStatus = data?.fetchStatus || data?.fetch_status;

  if (!integrationEnabled || missingToken) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          missingToken
            ? 'Chưa cấu hình GitHub API token trên server'
            : 'Tính năng metadata GitHub đang tắt'
        }
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rateLimited && (
        <Alert
          type="warning"
          showIcon
          message="GitHub đang giới hạn tốc độ (rate limit)"
          description="Hiển thị dữ liệu tạm thời / trống. Thử lại sau vài phút."
        />
      )}

      {unavailable && !repoName && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không truy cập được repository (404/403) hoặc URL không hợp lệ"
        />
      )}

      {repoName && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <GithubOutlined style={{ fontSize: 20 }} />
          <div style={{ flex: 1, minWidth: 160 }}>
            {htmlUrl ? (
              <Link href={htmlUrl} target="_blank" rel="noreferrer" strong>
                {repoName}
              </Link>
            ) : (
              <Text strong>{repoName}</Text>
            )}
            {description && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {description}
                </Text>
              </div>
            )}
          </div>
          <Space size={6} wrap>
            {language && <Tag>{language}</Tag>}
            {stars != null && (
              <Tag icon={<StarOutlined />}>
                {stars}
              </Tag>
            )}
            {fetchStatus && <Tag color="blue">{fetchStatus}</Tag>}
          </Space>
        </div>
      )}

      {!commits.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={rateLimited ? 'Không có commit do rate limit' : 'Chưa có commit để hiển thị'}
        />
      ) : (
        <List
          size="small"
          dataSource={commits}
          renderItem={(item) => {
            const sha = item.sha;
            const message = item.message || '(no message)';
            const authorName = item.authorName ?? item.author_name;
            const avatar = item.authorAvatarUrl ?? item.author_avatar_url;
            const date = item.date;
            const commitUrl = item.htmlUrl ?? item.html_url;
            return (
              <List.Item style={{ paddingInline: 0 }}>
                <List.Item.Meta
                  avatar={
                    anonymous || !avatar ? (
                      <Avatar size="small" icon={<GithubOutlined />} />
                    ) : (
                      <Avatar size="small" src={avatar} />
                    )
                  }
                  title={
                    <Space wrap size={6}>
                      {commitUrl ? (
                        <Link href={commitUrl} target="_blank" rel="noreferrer">
                          {message}
                        </Link>
                      ) : (
                        <Text>{message}</Text>
                      )}
                      <Text type="secondary" code style={{ fontSize: 11 }}>
                        {shortSha(sha)}
                      </Text>
                    </Space>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {!anonymous && authorName ? `${authorName} · ` : ''}
                      {formatCommitDate(date)}
                    </Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
};

export default GitHubRepoPanel;
