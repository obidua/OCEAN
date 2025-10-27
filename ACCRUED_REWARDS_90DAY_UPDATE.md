# 🔄 Accrued Rewards Claim Update - 90-Day Transaction Limit

## ✅ **Update Complete: claimROI() Function with 90-Day Limit**

### **🎯 Changes Made:**

#### **1. Updated Contract Function**
- **Previous:** `claimROIUpTo(periodsCount)` with dynamic period batching
- **Current:** `claimROI()` with fixed 90-day maximum per transaction
- **Contract:** RoiDistributor at `0x1bD00C34970b6CC89D852C350d00B074Bd3becbE`

#### **2. Smart Claiming Logic Updated**
- **Function:** `claimAccruedROISmart()` in store
- **Strategy:** Fixed 90-day limit per transaction instead of variable batching
- **Multi-Transaction Support:** Automatic calculation for remaining days

### **📊 New User Experience:**

#### **Scenario Examples:**

**Example 1: User has 60 days pending**
- ✅ **Single Transaction:** Claims all 60 days at once
- 📄 **Display:** "Claiming 60 days of accrued rewards"

**Example 2: User has 90 days pending**  
- ✅ **Single Transaction:** Claims all 90 days at once
- 📄 **Display:** "Claiming 90 days of accrued rewards"

**Example 3: User has 180 days pending**
- 🔄 **First Transaction:** Claims 90 days
- ⏳ **Remaining:** 90 days for next transaction
- 📄 **Display:** "Claiming 90 days of accrued rewards (90 days remaining for next transaction)"

#### **Confirmation Modal Updates:**
```
Total Pending Days: 180 days
Claiming Now: 90 days  
Remaining After This: 90 days
Max per Transaction: 90 days
Period: [Start Date] to [End Date for first 90 days]
```

### **🔧 Technical Implementation:**

#### **Store Function Changes:**
```javascript
// OLD: Variable batching with claimROIUpTo()
const periodsToClaimFirst = firstClaim.periodsCount; 
const transaction = roiDistributor.methods.claimROIUpTo(periodsToClaimFirst);

// NEW: Fixed 90-day limit with claimROI()  
const maxPeriodsPerTransaction = 90;
const periodsInThisTransaction = Math.min(autoWindow.totalPeriods, maxPeriodsPerTransaction);
const transaction = roiDistributor.methods.claimROI();
```

#### **UI Updates:**
- **Confirmation Modal:** Shows 90-day limit clearly
- **Warning Messages:** Explains remaining days for next transaction  
- **Progress Display:** Indicates current vs total days
- **Transaction Description:** Specifies exact days being claimed

### **📱 User Flow:**

#### **Step 1: User Clicks Claim**
- System uses `_autoWindow` to calculate total available days
- Shows summary with 90-day transaction limit

#### **Step 2: Confirmation Dialog**
```
🎯 Confirm ROI Claim
Total Pending Days: [X] days
Claiming Now: [min(X, 90)] days
Remaining After This: [max(0, X-90)] days  
```

#### **Step 3: Transaction Execution**
- Calls `claimROI()` function (max 90 days)
- Shows progress with exact day count
- Success message indicates days claimed

#### **Step 4: Post-Transaction**
- If remaining days > 0: Shows option for next claim
- Updates dashboard with new unclaimed balance
- Reflects 90-day chunks claimed in history

### **⚠️ Important Notes:**

#### **90-Day Contract Limit:**
- **Hard Limit:** Maximum 90 days per `claimROI()` call
- **Not Configurable:** Fixed at contract level
- **Automatic:** No user input needed for day selection

#### **Multiple Transaction Handling:**
- **Auto-Detection:** System automatically detects when >90 days pending
- **Clear Messaging:** Users informed about remaining days
- **Sequential Claims:** Users can claim remaining days in subsequent transactions

#### **Gas Optimization:**
- **Reduced Gas:** `claimROI()` more efficient than `claimROIUpTo()`
- **Fixed Computation:** No variable period calculations
- **Predictable Costs:** Consistent gas usage for 90-day chunks

### **🎨 UI Elements:**

#### **Status Indicators:**
- 🟢 **≤90 days:** Single transaction, all at once
- 🟡 **>90 days:** Multiple transactions needed
- 📊 **Progress Bar:** Shows current claim vs total pending

#### **Warning Messages:**
```
⚠️ 90-Day Transaction Limit
This transaction will claim 90 days. The remaining 
[X] days can be claimed in a separate transaction later.
```

### **✅ Benefits of 90-Day Limit:**

#### **For Users:**
- **Predictable:** Always know exactly what's being claimed
- **Fair Chunks:** Reasonable transaction sizes
- **Clear Progress:** Easy to understand remaining claims

#### **For System:**
- **Gas Efficiency:** Optimized contract calls
- **Reduced Complexity:** Simplified transaction logic  
- **Better Performance:** Consistent execution times

#### **For Blockchain:**
- **Lower Gas Costs:** More efficient than variable batching
- **Reduced Congestion:** Predictable transaction sizes
- **Better Reliability:** Fixed computation requirements

### **🔍 Testing Scenarios:**

#### **Test Case 1:** 45 days pending
- **Expected:** Single transaction, claims 45 days
- **Result:** ✅ Complete claim

#### **Test Case 2:** 90 days pending  
- **Expected:** Single transaction, claims 90 days
- **Result:** ✅ Complete claim

#### **Test Case 3:** 150 days pending
- **Expected:** First transaction claims 90 days, 60 remaining
- **Result:** ✅ Partial claim with clear next steps

#### **Test Case 4:** 270 days pending
- **Expected:** First transaction claims 90 days, 180 remaining  
- **Result:** ✅ Clear indication of 2 more transactions needed

The accrued rewards claiming system now operates with a clean, predictable 90-day limit per transaction, providing better user experience and optimal gas efficiency! 🎯📈