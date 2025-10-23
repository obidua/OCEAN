import { supabase } from '../lib/supabase';



export async function checkWalletRegistration(walletAddress){
  try {
    // const { data, error } = await supabase
    //   .from('users')
    //   .select('*')
    //   .eq('wallet_address', walletAddress)
    //   .maybeSingle();
    const { data, error } =""

    if (error) {
      console.error('Error checking wallet registration:', error);
      return { isRegistered: false };
    }

    if (data) {
      return { isRegistered: true, user: data };
    }

    return { isRegistered: false };
  } catch (error) {
    console.error('Error checking wallet registration:', error);
    return { isRegistered: false };
  }
}

export async function getUserById(userId) {
  try {
    // const { data, error } = await supabase
    //   .from('users')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .maybeSingle();
    const { data, error } =""
    

    if (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function registerUser(userData) {
  try {
    // const { data, error } = await supabase
    //   .from('users')
    //   .insert([userData])
    //   .select()
    //   .single();

     const { data, error } =""

    if (error) {
      console.error('Error registering user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: 'Registration failed' };
  }
}

export function mockConnectWallet() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockAddress = '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      resolve(mockAddress);
    }, 1000);
  });
}
