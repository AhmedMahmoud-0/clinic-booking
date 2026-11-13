export default function PublicLoading() {
  return (
    <main id="main-content" aria-label="Loading page">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-7 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div className="space-y-5">
          <div className="h-7 w-48 animate-pulse rounded-full bg-[#E4ECE9]" />
          <div className="h-14 max-w-xl animate-pulse rounded-xl bg-[#E4ECE9]" />
          <div className="h-14 max-w-md animate-pulse rounded-xl bg-[#E4ECE9]" />
          <div className="h-5 max-w-lg animate-pulse rounded-lg bg-[#E9EFED]" />
          <div className="h-5 max-w-md animate-pulse rounded-lg bg-[#E9EFED]" />
          <div className="h-12 w-44 animate-pulse rounded-full bg-[#D9E8E4]" />
        </div>
        <div className="min-h-80 animate-pulse rounded-[2rem] border border-[#E4ECE9] bg-white" />
      </div>
    </main>
  );
}
