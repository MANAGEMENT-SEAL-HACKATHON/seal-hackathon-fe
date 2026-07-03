import { useEffect } from "react";
import { Input } from "antd";
import { useLocation } from "react-router-dom";

// === LOGIC CUỘN MÀN HÌNH THEO HASH URL TẠI TRANG SETUP ===
const SetupPage = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const timer = setTimeout(() => {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.style.transition = "background 0.5s";
          element.style.backgroundColor = "#fffbe6";
          setTimeout(() => {
            element.style.backgroundColor = "transparent";
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hash]);

  return (
    <div>
      <div id="round-3" className="target-element">
        <Input placeholder="Ngày thi Sơ loại" />
      </div>
    </div>
  );
};
