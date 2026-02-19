import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { networkSpeed_styles } from '../../common/Styles/Style';

interface HeaderProps {
  onClick: () => void;
  isConnected: boolean | null;
}

const NetworkSpeed: React.FC<HeaderProps> = ({ onClick, isConnected }) => {
  const handleClick = () => {
    onClick();
  };

  return (
    <View style={networkSpeed_styles.container}>
      <TouchableOpacity onPress={handleClick} disabled={!isConnected} style={[networkSpeed_styles.button, !isConnected && networkSpeed_styles.disabledbutton]}>
        {/* <Icon name="logout" size={20} color="#000" /> */}
        <MaterialIcons name="network-check" color="#000" size={20} />
      </TouchableOpacity>
    </View>
  );
};

export default NetworkSpeed;
