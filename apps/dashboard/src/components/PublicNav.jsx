import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves, Menu, X } from 'lucide-react';

export default function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [learnMenuOpen, setLearnMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 cyber-glass border-b border-cyan-500/20 backdrop-blur-md safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-16">
          <Link to="/" className="flex items-center gap-2">
            <Waves className="text-cyan-400" size={28} />
            <span className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">
              OCEAN DeFi
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <Link to="/" className="text-cyan-300 hover:text-neon-green transition-colors text-sm lg:text-base">Home</Link>
            <Link to="/smart-contracts" className="text-cyan-300 hover:text-neon-green transition-colors text-sm lg:text-base">Smart Contract</Link>
            <Link to="/what-is-defi" className="text-cyan-300 hover:text-neon-green transition-colors text-sm lg:text-base">What is DeFi?</Link>



            {/* <Link to="/features" className="text-cyan-300 hover:text-neon-green transition-colors text-sm lg:text-base">Features</Link> */}
            {/* <Link to="/how-it-works" className="text-cyan-300 hover:text-neon-green transition-colors text-sm lg:text-base">How It Works</Link> */}
            <div className="relative group">
              <button className="text-cyan-300 hover:text-neon-green transition-colors text-sm lg:text-base">About Ramestta ▾</button>
              <div className="absolute top-full left-0 mt-2 w-64 cyber-glass border border-cyan-500/30 rounded-xl shadow-neon-cyan opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-[80vh] overflow-y-auto">
                <div className="py-2">
                  {/* <div className="px-4 py-2 text-xs font-bold text-neon-green uppercase tracking-wider">Foundation</div> */}
                  {/* <Link to="/money-revolution" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">Money Evolution</Link> */}
                  {/* <Link to="/blockchain-basics" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">Blockchain Basics</Link> */}
                  {/* <Link to="/smart-contracts" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">Smart Contracts</Link> */}
                  {/* <Link to="/what-is-defi" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">What is DeFi?</Link> */}

                  <div className="border-t border-cyan-500/30 my-2"></div>
                  {/* <div className="px-4 py-2 text-xs font-bold text-neon-green uppercase tracking-wider">Ramestta Network</div> */}
                  {/* <Link to="/ramestta-blockchain" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">Ramestta Network</Link> */}
                  <Link to="/ramestta-blockchain" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">Ramestta Blockchain</Link>
                  <Link to="/rama-tokenomics" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">RAMA Tokenomics</Link>
                  <Link to="/validator-security" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm">Validator Security</Link>

                  <div className="border-t border-cyan-500/30 my-2"></div>
                  {/* <div className="px-4 py-2 text-xs font-bold text-neon-green uppercase tracking-wider">Ocean DeFi</div> */}
                  {/* <Link to="/ocean-defi-guide" className="block px-4 py-2 text-cyan-300 hover:text-neon-green hover:bg-cyan-500/10 transition-colors text-sm font-semibold">Complete Income Guide</Link> */}
                </div>
              </div>
            </div>
            {/* <button
              onClick={generateOceanDefiPDF}
              className="px-3 lg:px-4 py-2 cyber-glass border border-neon-green/30 text-neon-green hover:bg-neon-green/10 hover:border-neon-green/50 transition-all rounded-lg text-sm lg:text-base flex items-center gap-2"
            >
              <FileDown size={18} />
              <span className="hidden lg:inline">Download PDF</span>
            </button> */}
            <Link
              to="/login"
              className="px-4 lg:px-6 py-2 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-lg font-bold hover:shadow-neon-cyan transition-all text-sm lg:text-base"
            >
              Launch App
            </Link>
          </div>



          {/* ======================================================================= */}
          {/* Mobile Menu Button */}
          {/* ======================================================================= */}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-cyan-300 hover:text-neon-green transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-cyan-500/20 py-4">
            <div className="flex flex-col space-y-3">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-cyan-300 hover:text-neon-green transition-colors px-4 py-2"
              >
                Home
              </Link>
              <Link
                to="/smart-contracts"
                onClick={() => setMobileMenuOpen(false)}
                className="text-cyan-300 hover:text-neon-green transition-colors px-4 py-2"
              >
                Smart Contract
              </Link>
              <Link
                to="/what-is-defi"
                onClick={() => setMobileMenuOpen(false)}
                className="text-cyan-300 hover:text-neon-green transition-colors px-4 py-2"
              >
                What is DeFi?
              </Link>

              {/* Mobile Learn Submenu */}
              <div>
                <button
                  onClick={() => setLearnMenuOpen(!learnMenuOpen)}
                  className="w-full text-left text-cyan-300 hover:text-neon-green transition-colors px-4 py-2"
                >
                  About Ramestta{learnMenuOpen ? '▴' : '▾'}
                </button>
                {learnMenuOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    {/* <div className="px-4 py-1 text-xs font-bold text-neon-green uppercase tracking-wider">Foundation</div> */}

                    {/* <Link
                      to="/ramestta-blockchain"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      Ramestta Network
                    </Link> */}

                    <Link
                      to="/ramestta-blockchain"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      Ramestta Blockchain
                    </Link>
                    <Link
                      to="/rama-tokenomics"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      RAMA Tokenomics
                    </Link>
                    <Link
                      to="/validator-security"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      Validator Security
                    </Link>
                    {/* <Link
                      to="/what-is-defi"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      What is DeFi?
                    </Link> */}

                    {/* <div className="px-4 py-1 text-xs font-bold text-neon-green uppercase tracking-wider mt-3">Ramestta Network</div> */}
                    {/* <Link
                      to="/ramestta-blockchain"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      Ramestta Blockchain
                    </Link> */}
                    {/* <Link
                      to="/rama-tokenomics"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      RAMA Tokenomics
                    </Link> */}
                    {/* <Link
                      to="/validator-security"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300/80 hover:text-neon-green transition-colors px-4 py-2 text-sm"
                    >
                      Validator Security
                    </Link> */}

                    {/* <div className="px-4 py-1 text-xs font-bold text-neon-green uppercase tracking-wider mt-3">Ocean DeFi</div> */}
                    {/* <Link
                      to="/ocean-defi-guide"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-cyan-300 hover:text-neon-green transition-colors px-4 py-2 text-sm font-semibold"
                    >
                      Complete Income Guide
                    </Link> */}
                  </div>
                )}
              </div>

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mx-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-lg font-bold hover:shadow-neon-cyan transition-all text-center"
              >
                Launch App
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
