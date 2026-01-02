function Navbar() {
  return (
    <div className="flex items-center space-x-3">
      <button className="px-3 py-1 bg-black hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors">
        PRO
      </button>
      <button className="w-9 h-9 bg-orange-500 hover:bg-orange-800 rounded-full flex items-center justify-center transition-colors">
        <span className="text-white font-semibold text-sm">U</span>
      </button>
    </div>
  )
}

export default Navbar
