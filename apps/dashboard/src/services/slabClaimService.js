import { readContract, writeContract, waitForTransaction } from '@wagmi/core';
import SlabIncomeDistributorABI from '../../store/Contract_ABI/SlabIncomeDistributor.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_SLAB_DISTRIBUTOR_PROXY_ADDRESS;
const API_BASE_URL = '/api/slab-claim';

/**
 * Fetch Merkle proof for a specific day from the API
 * @param {string} userAddress - User's wallet address
 * @param {number} dayId - Day ID to get proof for
 * @param {string} incomeType - 'slab', 'override', or 'both'
 * @returns {Promise<Object>} Proof data with amounts and merkle proof
 */
export async function getMerkleProof(userAddress, dayId, incomeType = 'both') {
  try {
    const response = await fetch(
      `${API_BASE_URL}/proof/${userAddress}/${dayId}?type=${incomeType}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Merkle proof');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Merkle proof:', error);
    throw error;
  }
}

/**
 * Get last claimed day for a user
 * @param {string} userAddress - User's wallet address
 * @returns {Promise<number>} Last claimed day ID
 */
export async function getLastClaimedDay(userAddress) {
  try {
    const result = await readContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName: 'lastClaimedDay',
      args: [userAddress],
    });
    return Number(result);
  } catch (error) {
    console.error('Error getting last claimed day:', error);
    return 0;
  }
}

/**
 * Check if a specific proof has been claimed
 * @param {string} proofId - Proof ID (hash of user + dayId + incomeType)
 * @returns {Promise<boolean>} True if already claimed
 */
export async function isProofClaimed(proofId) {
  try {
    const result = await readContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName: 'claimedProofs',
      args: [proofId],
    });
    return result;
  } catch (error) {
    console.error('Error checking proof claimed status:', error);
    return false;
  }
}

/**
 * Get Merkle root for a specific day
 * @param {number} dayId - Day ID
 * @param {string} treeType - 'slab' or 'override'
 * @returns {Promise<string>} Merkle root hash
 */
export async function getMerkleRoot(dayId, treeType = 'slab') {
  try {
    const functionName = treeType === 'slab' 
      ? 'dailySlabMerkleRoots' 
      : 'dailyOverrideMerkleRoots';
    
    const result = await readContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName,
      args: [dayId],
    });
    return result;
  } catch (error) {
    console.error('Error getting Merkle root:', error);
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

/**
 * Claim income for a single day with Merkle proof
 * @param {Object} params - Claim parameters
 * @param {number} params.dayId - Day ID to claim
 * @param {string} params.usdAmount - USD amount (wei format)
 * @param {string} params.ramaAmount - RAMA amount (wei format)
 * @param {string[]} params.merkleProof - Array of proof hashes
 * @returns {Promise<Object>} Transaction receipt
 */
export async function claimWithProof({ dayId, usdAmount, ramaAmount, merkleProof }) {
  try {
    const { hash } = await writeContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName: 'claimWithProof',
      args: [dayId, usdAmount, ramaAmount, merkleProof],
    });
    
    const receipt = await waitForTransaction({ hash });
    return receipt;
  } catch (error) {
    console.error('Error claiming with proof:', error);
    throw error;
  }
}

/**
 * Claim income for multiple days in batch
 * @param {Object} params - Batch claim parameters
 * @param {number[]} params.dayIds - Array of day IDs
 * @param {string[]} params.usdAmounts - Array of USD amounts (wei format)
 * @param {string[]} params.ramaAmounts - Array of RAMA amounts (wei format)
 * @param {string[][]} params.merkleProofs - Array of proof arrays
 * @returns {Promise<Object>} Transaction receipt
 */
export async function claimBatchWithProof({ dayIds, usdAmounts, ramaAmounts, merkleProofs }) {
  try {
    const { hash } = await writeContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName: 'claimBatchWithProof',
      args: [dayIds, usdAmounts, ramaAmounts, merkleProofs],
    });
    
    const receipt = await waitForTransaction({ hash });
    return receipt;
  } catch (error) {
    console.error('Error claiming batch with proof:', error);
    throw error;
  }
}

/**
 * Claim only slab income for a day
 * @param {Object} params - Slab claim parameters
 * @param {number} params.dayId - Day ID to claim
 * @param {string} params.slabUsdAmount - Slab USD amount (wei format)
 * @param {string} params.slabRamaAmount - Slab RAMA amount (wei format)
 * @param {string[]} params.slabProof - Slab proof array
 * @returns {Promise<Object>} Transaction receipt
 */
export async function claimSlabWithProof({ dayId, slabUsdAmount, slabRamaAmount, slabProof }) {
  try {
    const { hash } = await writeContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName: 'claimSlabWithProof',
      args: [dayId, slabUsdAmount, slabRamaAmount, slabProof],
    });
    
    const receipt = await waitForTransaction({ hash });
    return receipt;
  } catch (error) {
    console.error('Error claiming slab with proof:', error);
    throw error;
  }
}

/**
 * Claim only override income for a day
 * @param {Object} params - Override claim parameters
 * @param {number} params.dayId - Day ID to claim
 * @param {string} params.overrideUsdAmount - Override USD amount (wei format)
 * @param {string} params.overrideRamaAmount - Override RAMA amount (wei format)
 * @param {string[]} params.overrideProof - Override proof array
 * @returns {Promise<Object>} Transaction receipt
 */
export async function claimOverrideWithProof({ dayId, overrideUsdAmount, overrideRamaAmount, overrideProof }) {
  try {
    const { hash } = await writeContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName: 'claimOverrideWithProof',
      args: [dayId, overrideUsdAmount, overrideRamaAmount, overrideProof],
    });
    
    const receipt = await waitForTransaction({ hash });
    return receipt;
  } catch (error) {
    console.error('Error claiming override with proof:', error);
    throw error;
  }
}

/**
 * Claim both slab and override income for a day (recommended - saves gas)
 * @param {Object} params - Both claim parameters
 * @param {number} params.dayId - Day ID to claim
 * @param {string} params.slabUsdAmount - Slab USD amount (wei format)
 * @param {string} params.slabRamaAmount - Slab RAMA amount (wei format)
 * @param {string} params.overrideUsdAmount - Override USD amount (wei format)
 * @param {string} params.overrideRamaAmount - Override RAMA amount (wei format)
 * @param {string[]} params.slabProof - Slab proof array
 * @param {string[]} params.overrideProof - Override proof array
 * @returns {Promise<Object>} Transaction receipt
 */
export async function claimBothWithProof({
  dayId,
  slabUsdAmount,
  slabRamaAmount,
  overrideUsdAmount,
  overrideRamaAmount,
  slabProof,
  overrideProof
}) {
  try {
    const { hash } = await writeContract({
      address: CONTRACT_ADDRESS,
      abi: SlabIncomeDistributorABI,
      functionName: 'claimBothWithProof',
      args: [
        dayId,
        slabUsdAmount,
        slabRamaAmount,
        overrideUsdAmount,
        overrideRamaAmount,
        slabProof,
        overrideProof
      ],
    });
    
    const receipt = await waitForTransaction({ hash });
    return receipt;
  } catch (error) {
    console.error('Error claiming both with proof:', error);
    throw error;
  }
}

/**
 * Helper to format amounts from API to contract format (wei)
 * @param {number} amount - Amount in standard units
 * @param {number} decimals - Token decimals (default 18)
 * @returns {string} Amount in wei as string
 */
export function toWei(amount, decimals = 18) {
  return (BigInt(Math.floor(amount * (10 ** decimals)))).toString();
}

/**
 * Helper to format amounts from contract to display format
 * @param {string|bigint} amount - Amount in wei
 * @param {number} decimals - Token decimals (default 18)
 * @returns {number} Amount in standard units
 */
export function fromWei(amount, decimals = 18) {
  return Number(amount) / (10 ** decimals);
}

export default {
  getMerkleProof,
  getLastClaimedDay,
  isProofClaimed,
  getMerkleRoot,
  claimWithProof,
  claimBatchWithProof,
  claimSlabWithProof,
  claimOverrideWithProof,
  claimBothWithProof,
  toWei,
  fromWei,
  CONTRACT_ADDRESS,
};
