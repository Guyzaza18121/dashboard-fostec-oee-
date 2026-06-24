import { NAV_ITEMS } from "../data/dashboardData.js";
import Icon from "./shared/Icon.jsx";
import "./BottomNav.css";

export default function BottomNav({ activeView, onChangeView }) {
  return (
    <nav className="bottom-nav" aria-label="Dashboard navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${item.id === activeView ? "active" : ""}`}
          type="button"
          onClick={() => onChangeView(item.id)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
