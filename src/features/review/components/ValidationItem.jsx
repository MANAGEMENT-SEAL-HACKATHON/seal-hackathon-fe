import React from "react";
import { theme, Typography } from "antd";
import { XCircle, AlertTriangle } from "lucide-react";

const { useToken } = theme;
const { Text } = Typography;

export const ValidationItem = ({ status, code, details, message, index }) => {
  const { token } = useToken();
  const isError = status === "error";

  const color = isError ? token.colorError : token.colorWarning;
  const bgSoft = isError ? token.colorErrorBg : token.colorWarningBg;

  const generateCustomMessage = () => {
    const getTargetName = () => {
      if (!message) return "Hạng mục này";

      if (message.includes("Round Chung kết") || message.includes("FINAL")) {
        return "Vòng Chung kết";
      }

      const match = message.match(/Track '(.*?)'/);
      if (match && match[1]) {
        return `Bảng đấu "${match[1]}" (Sơ loại)`;
      }

      return "Hạng mục này";
    };

    const targetName = getTargetName();

    switch (code) {
      // --- NHÓM 1: TIÊU CHÍ & TRỌNG SỐ ---
      case "TRACK_CRITERIA_WEIGHT":
      case "FINAL_CRITERIA_WEIGHT": {
        const totalWeight = details?.total
          ? parseFloat(details.total).toFixed(2)
          : "0.00";
        return (
          <span>
            Tổng trọng số (Weight) của các tiêu chí tại{" "}
            <strong>{targetName}</strong> đang là{" "}
            <strong style={{ color: token.colorError }}>{totalWeight}</strong>.
            <br />
            <Text type="secondary">
              Yêu cầu bắt buộc tổng phải bằng{" "}
              <strong style={{ color: token.colorTextHeading }}>1.00</strong>.
              Vui lòng điều chỉnh lại tỷ lệ.
            </Text>
          </span>
        );
      }

      case "ROUND_NO_CRITERIA":
        return (
          <span>
            <strong>{targetName}</strong> hiện tại chưa có Tiêu chí chấm điểm
            nào được thiết lập.
            <br />
            <Text type="secondary">
              Vui lòng thêm ít nhất 1 tiêu chí để Giám khảo có thể chấm bài.
            </Text>
          </span>
        );

      // --- NHÓM 2: VÒNG THI & TRACK ---
      case "MISSING_PRELIMINARY_ROUND":
        return (
          <span>
            Giải đấu <strong>chưa có Vòng Sơ loại</strong> hoặc chưa có bảng đấu nào.
            <br />
            <Text type="secondary">
              Vui lòng tạo vòng thi và thiết lập bảng đấu để tiếp tục.
            </Text>
          </span>
        );

      case "MISSING_FINAL_ROUND":
        return (
          <span>
            Giải đấu <strong>chưa có Vòng Chung kết</strong>, hoặc đang có nhiều
            hơn 1 Vòng Chung kết.
            <br />
            <Text type="secondary">
              Hệ thống yêu cầu chỉ được phép có đúng 1 Vòng Chung kết.
            </Text>
          </span>
        );

      // --- NHÓM 3: LỊCH TRÌNH SỰ KIỆN ---
      case "EVENT_KICKOFF_MISSING":
        return (
          <span>
            Giải đấu đang thiếu sự kiện <strong>Khai mạc (KICKOFF)</strong>.
            <br />
            <Text type="secondary">
              Đây là sự kiện bắt buộc phải có để chính thức bắt đầu Hackathon.
            </Text>
          </span>
        );

      case "EVENT_ORDER_VIOLATION":
        return (
          <span>
            Thứ tự sự kiện không hợp lệ.
            <br />
            <Text type="secondary">
              Tạo <strong>KICKOFF</strong> trước <strong>WORKSHOP</strong> (POST order). Trên lịch, Workshop phải diễn ra trước Khai mạc và khác ngày.
            </Text>
          </span>
        );

      case "EVENT_AWARDS_MISSING":
        return (
          <span>
            Đã có Vòng Chung kết thì bắt buộc phải tạo thêm sự kiện{" "}
            <strong>Lễ trao giải (AWARDS)</strong>.
          </span>
        );

      case "EVENT_OUT_OF_HACKATHON": {
        const eventName = details?.eventType || "Sự kiện này";
        return (
          <span>
            Lịch trình tổ chức <strong>{eventName}</strong> đang bị xung đột
            thời gian.
            <br />
            <Text type="secondary">
              Bắt buộc phải diễn ra <strong>sau ngày đóng đăng ký</strong> và
              nằm trong khung thời gian của giải đấu.
            </Text>
          </span>
        );
      }

      // --- NHÓM 4: CẢNH BÁO ---
      case "READINESS_WARNING":
        return (
          <span>
            <strong>{targetName}</strong> hiện tại chưa có Mentor (Cố vấn) nào
            được phân công hỗ trợ.
          </span>
        );

      default: {
        if (!message) return <span>Có lỗi xảy ra, vui lòng kiểm tra lại.</span>;

        let cleanedFallback = message.replace(/\s*\([^)]*=[^)]*\)/g, "");
        cleanedFallback = cleanedFallback.replace(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/g,
          (match) => {
            const date = new Date(match);
            return date.toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          },
        );

        return <span>{cleanedFallback}</span>;
      }
    }
  };

  return (
    <div
      className="validation-item-hover"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "16px 20px",
        marginBottom: "12px",
        borderRadius: "12px",
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: token.boxShadowTertiary,
        transition: "all 0.3s ease",
        animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
      }}
    >
      <div
        style={{
          marginTop: 2,
          backgroundColor: bgSoft,
          padding: 8,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
        }}
      >
        {isError ? (
          <XCircle size={18} color={color} />
        ) : (
          <AlertTriangle size={18} color={color} />
        )}
      </div>

      <div style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color: token.colorTextTertiary,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 6,
            display: "block",
          }}
        >
          {code}
        </Text>

        <div
          style={{
            color: token.colorText,
            fontSize: 14,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          {generateCustomMessage()}
        </div>
      </div>
    </div>
  );
};
