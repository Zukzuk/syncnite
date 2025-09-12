
export function AlphabeticalSeparatorRow({ bucket, top }: { bucket: string; top: number }) {
  return (
    <div className="alphabetical-separator" style={{ top }}>
      {bucket}
    </div>
  );
}
