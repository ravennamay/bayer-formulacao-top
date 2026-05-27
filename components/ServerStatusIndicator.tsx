import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HealthStatus } from '../src/healthCheck';

interface ServerStatusIndicatorProps {
  healthStatus?: HealthStatus;
  onStatusChange?: (status: HealthStatus) => void;
  textColor?: string;
  backgroundColor?: string;
}

export const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({
  healthStatus,
  textColor = '#FFFFFF',
  backgroundColor = '#6B7280',
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (healthStatus?.isHealthy === false) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [healthStatus?.isHealthy]);

  if (!healthStatus) {
    return null;
  }

  const statusColor = healthStatus.isHealthy ? '#10B981' : '#EF4444';
  const iconName = healthStatus.isHealthy ? 'checkmark-circle' : 'alert-circle';
  const statusLabel = healthStatus.isHealthy ? 'Online' : 'Offline';

  return (
    <>
      <TouchableOpacity
        style={[
          styles.indicator,
          {
            backgroundColor: statusColor + '20',
            borderColor: statusColor,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor: statusColor,
              },
            ]}
          />
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: statusColor }]}>Servidor</Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={statusColor} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Status do Servidor</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: statusColor + '15',
                    borderColor: statusColor,
                  },
                ]}
              >
                <View style={styles.statusCardHeader}>
                  <Ionicons name={iconName} size={32} color={statusColor} />
                  <Text style={[styles.statusCardTitle, { color: statusColor }]}>
                    {statusLabel.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.statusMessage}>{healthStatus.message}</Text>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>Detalhes da Conexão</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: statusColor }]}>{statusLabel}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tempo de Resposta:</Text>
                  <Text style={styles.detailValue}>{healthStatus.responseTime}ms</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Última Verificação:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(healthStatus.lastCheck).toLocaleTimeString('pt-BR')}
                  </Text>
                </View>

                {healthStatus.error && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Erro:</Text>
                    <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                      {healthStatus.error}
                    </Text>
                  </View>
                )}
              </View>

              {!healthStatus.isHealthy && (
                <View style={styles.troubleshootingSection}>
                  <Text style={styles.troubleshootingTitle}>O que fazer?</Text>
                  <View style={styles.troubleshootingItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.troubleshootingText}>
                      Verifique se o servidor backend está rodando
                    </Text>
                  </View>
                  <View style={styles.troubleshootingItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.troubleshootingText}>
                      Verifique sua conexão com a internet
                    </Text>
                  </View>
                  <View style={styles.troubleshootingItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.troubleshootingText}>
                      Tente novamente em alguns momentos
                    </Text>
                  </View>
                  <View style={styles.troubleshootingItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.troubleshootingText}>
                      Verifique o endereço do servidor nas configurações
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
    gap: 20,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  detailsSection: {
    gap: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  troubleshootingSection: {
    gap: 12,
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  troubleshootingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  troubleshootingText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
});
