// Merit's sidebar-bars mark + wordmark, shared between the dashboard
// sidebar and the full-page auth gate (their only two call sites).
export default function Logo({ trademarkSize = "10px", iconAriaHidden = false }) {
  return (
    <>
      <div className="sb-logo" aria-hidden={iconAriaHidden || undefined}>
        <i style={{ height: "10px", background: "#cad2fb" }} />
        <i style={{ height: "15px", background: "#7c74f4" }} />
        <i style={{ height: "20px", background: "#4f46e5" }} />
      </div>
      <b>
        Merit
        <span style={{ fontSize: trademarkSize, fontWeight: 400, verticalAlign: "super", marginLeft: "1px" }}>
          &trade;
        </span>
      </b>
    </>
  );
}
