export default function Logo({ trademarkSize = "10px", iconAriaHidden = false }) {
  return (
    <>
      <div className="sb-logo" aria-hidden={iconAriaHidden || undefined}>
        <i style={{ height: "10px" }} />
        <i style={{ height: "15px" }} />
        <i style={{ height: "20px" }} />
      </div>
      <b>
        Merit AC
        <span style={{ fontSize: trademarkSize, fontWeight: 400, verticalAlign: "super", marginLeft: "1px" }}>
          &trade;
        </span>
      </b>
    </>
  );
}
