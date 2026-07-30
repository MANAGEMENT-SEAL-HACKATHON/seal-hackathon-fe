import { Input, Modal, message } from 'antd';
import { resolveUserError } from '../../../shared/errors/resolveUserError';

/**
 * Modal.confirm with required reason textarea for declining an assignment.
 * @returns {Promise<string|null>} trimmed reason, or null if cancelled
 */
export function promptDeclineReason() {
  return new Promise((resolve) => {
    let reason = '';
    Modal.confirm({
      title: 'Từ chối tham gia',
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Bạn sẽ không còn được tính trong phân công này. Ban tổ chức sẽ được thông báo để gán lại.
          </p>
          <Input.TextArea
            rows={3}
            maxLength={1000}
            placeholder="Nhập lý do từ chối (bắt buộc)"
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: 'Xác nhận từ chối',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => {
        const trimmed = String(reason || '').trim();
        if (!trimmed) {
          message.warning('Vui lòng nhập lý do từ chối');
          return Promise.reject();
        }
        resolve(trimmed);
        return Promise.resolve();
      },
      onCancel: () => resolve(null),
    });
  });
}

export async function runDeclineAssignment(declineFn, { onSuccess } = {}) {
  const reason = await promptDeclineReason();
  if (!reason) return false;
  try {
    await declineFn(reason);
    message.success('Đã từ chối phân công');
    if (onSuccess) await onSuccess();
    return true;
  } catch (error) {
    message.error(
      resolveUserError(error, {
        fallback: 'Không thể từ chối phân công. Vui lòng thử lại.',
      }),
    );
    return false;
  }
}
