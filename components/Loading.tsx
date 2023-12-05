export const Loading = () => {
    return(
        <div onClick={e=>e.stopPropagation()} className="fixed z-50 top-0 left-0 w-full h-screen flex justify-center items-center backdrop-blur-sm backdrop-brightness-50">
            <svg height="110" width="110" viewBox="0 0 110 110" style={{width:50, height:50}} className="animate-spin stroke-slate-200">
                <path d={`M5 55 A50 50 0 0 1 105 55`} strokeWidth={10} fill="none"/>
                <path d={`M105 54 A50 50 0 0 1 55 105`} strokeWidth={10} fill="none"/>
            </svg>
        </div>
    );
}