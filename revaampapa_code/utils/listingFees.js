// Fee calculation based on property type and value (50% reduced)
const calculateListingFee = (propertyType, transactionType, value) => {
    let feePercentage = 0;
    let maxFee = Infinity;
    
    switch(propertyType) {
        case 'shortlet':
            if (transactionType === 'rent') {
                feePercentage = 0.02; // 2% (reduced from 4%)
                maxFee = 50000; // Cap at ₦50,000
            }
            break;
            
        case 'building':
            if (transactionType === 'rent') {
                feePercentage = 0.03; // 3% for residential rent (reduced from 6%)
                maxFee = 75000; // Cap at ₦75,000
            } else { // sale
                feePercentage = 0.0075; // 0.75% for sale (reduced from 1.5%)
                maxFee = 250000; // Cap at ₦250,000
            }
            break;
            
        case 'land':
            feePercentage = 0.0075; // 0.75% (reduced from 1.5%)
            maxFee = 150000; // Cap at ₦150,000
            break;
            
        case 'shop':
        case 'business_complex':
            if (transactionType === 'rent') {
                feePercentage = 0.02; // 2% for commercial rent (reduced from 4%)
                maxFee = 200000; // Cap at ₦200,000
            } else {
                feePercentage = 0.0075; // 0.75% for sale (reduced from 1.5%)
                maxFee = 300000; // Cap at ₦300,000
            }
            break;
    }
    
    let fee = value * feePercentage;
    
    // Apply caps
    if (maxFee && fee > maxFee) {
        fee = maxFee;
    }
    
    // Minimum fee
    const minFee = 5000; // ₦5,000 minimum
    if (fee < minFee) {
        fee = minFee;
    }
    
    return Math.round(fee);
};

// Tier definitions with 50% reduced pricing
const listingTiers = {
    free: {
        name: 'Free',
        price: 0,
        commissionSplit: {
            agent: 70,
            promoter: 10,
            platform: 20
        },
        features: [
            'Basic property listing',
            'Up to 5 images',
            'Standard search visibility',
            'Agent promotion eligible (70% commission)'
        ]
    },
    
    standard: {
        name: 'Featured',
        price: 'calculated',
        commissionSplit: {
            agent: 70,
            promoter: 12.5,
            platform: 17.5
        },
        features: [
            'Featured in search results',
            'Up to 15 images',
            'Video tour upload',
            'Priority agent promotion',
            'Social media spotlight',
            '"Featured" badge',
            'Promoter earns 12.5% commission'
        ]
    },
    
    premium: {
        name: 'Premium',
        price: 'calculated',
        commissionSplit: {
            agent: 72.5,
            promoter: 15,
            platform: 12.5
        },
        features: [
            'Top featured placement (position 1-3)',
            'Unlimited images',
            'Video tour + 360° virtual tour',
            'SMS/WhatsApp alerts to top 200 agents',
            '48-hour exclusive agent preview',
            'Dedicated account manager',
            'Weekly performance reports',
            'Social media campaign',
            'Email newsletter feature',
            'Promoter earns 15% commission'
        ]
    }
};

// Calculate price for a specific property and tier
const getTierPrice = (property, tier) => {
    if (tier === 'free') return 0;
    
    const value = property.price;
    const propertyType = property.propertyType;
    const transactionType = property.transactionType;
    
    let baseFee = calculateListingFee(propertyType, transactionType, value);
    
    // Premium tier is 2x standard
    if (tier === 'premium') {
        baseFee = baseFee * 2;
    }
    
    return baseFee;
};

// Calculate upgrade fee
const getUpgradeFee = (property, currentTier, newTier) => {
    const currentFee = currentTier === 'free' ? 0 : getTierPrice(property, currentTier);
    const newFee = getTierPrice(property, newTier);
    return newFee - currentFee;
};

module.exports = {
    calculateListingFee,
    listingTiers,
    getTierPrice,
    getUpgradeFee
};