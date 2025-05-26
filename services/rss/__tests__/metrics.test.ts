// services/rss/__tests__/metrics.test.ts

import { Metrics } from '../metrics';

describe('Metrics', () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics('test');
  });

  describe('constructor', () => {
    it('should initialize with a prefix', () => {
      const customMetrics = new Metrics('custom_prefix');
      customMetrics.increment('counter');

      const result = customMetrics.getMetrics();
      expect(Object.keys(result)).toContain('custom_prefix_counter');
    });


    it('should handle empty prefix', () => {
      const emptyPrefixMetrics = new Metrics('');
      emptyPrefixMetrics.increment('test');

      const result = emptyPrefixMetrics.getMetrics();
      expect(Object.keys(result)).toContain('_test');
    });

    it('should handle prefix with special characters', () => {
      const specialMetrics = new Metrics('api-v1.metrics');
      specialMetrics.increment('requests');

      const result = specialMetrics.getMetrics();
      expect(Object.keys(result)).toContain('api-v1.metrics_requests');
    });
  });

  describe('increment', () => {
    it('should increment counter with default value of 1', () => {
      metrics.increment('requests');

      const result = metrics.getMetrics();
      expect(result['test_requests']).toBe(1);
    });

    it('should increment counter with custom value', () => {
      metrics.increment('bytes', 1024);

      const result = metrics.getMetrics();
      expect(result['test_bytes']).toBe(1024);
    });

    it('should accumulate multiple increments', () => {
      metrics.increment('requests');
      metrics.increment('requests');
      metrics.increment('requests', 3);

      const result = metrics.getMetrics();
      expect(result['test_requests']).toBe(5);
    });

    it('should handle negative increments', () => {
      metrics.increment('counter', 10);
      metrics.increment('counter', -3);

      const result = metrics.getMetrics();
      expect(result['test_counter']).toBe(7);
    });

    it('should handle zero increment', () => {
      metrics.increment('counter', 5);
      metrics.increment('counter', 0);

      const result = metrics.getMetrics();
      expect(result['test_counter']).toBe(5);
    });

    it('should handle decimal increments', () => {
      metrics.increment('score', 1.5);
      metrics.increment('score', 2.7);

      const result = metrics.getMetrics();
      expect(result['test_score']).toBeCloseTo(4.2);
    });

    it('should handle very large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      metrics.increment('large', largeNumber);

      const result = metrics.getMetrics();
      expect(result['test_large']).toBe(largeNumber);
    });

    it('should handle multiple different counters', () => {
      metrics.increment('requests');
      metrics.increment('errors', 2);
      metrics.increment('success', 5);

      const result = metrics.getMetrics();
      expect(result['test_requests']).toBe(1);
      expect(result['test_errors']).toBe(2);
      expect(result['test_success']).toBe(5);
    });

    it('should handle counter names with special characters', () => {
      metrics.increment('http_200');
      metrics.increment('cache-hits');
      metrics.increment('db.queries');

      const result = metrics.getMetrics();
      expect(result['test_http_200']).toBe(1);
      expect(result['test_cache-hits']).toBe(1);
      expect(result['test_db.queries']).toBe(1);
    });
  });

  describe('gauge', () => {
    it('should set gauge value', () => {
      metrics.gauge('memory', 256);

      const result = metrics.getMetrics();
      expect(result['test_memory']).toBe(256);
    });

    it('should overwrite existing gauge value', () => {
      metrics.gauge('cpu', 50);
      metrics.gauge('cpu', 75);

      const result = metrics.getMetrics();
      expect(result['test_cpu']).toBe(75);
    });

    it('should handle zero gauge value', () => {
      metrics.gauge('connections', 0);

      const result = metrics.getMetrics();
      expect(result['test_connections']).toBe(0);
    });

    it('should handle negative gauge values', () => {
      metrics.gauge('temperature', -10);

      const result = metrics.getMetrics();
      expect(result['test_temperature']).toBe(-10);
    });

    it('should handle decimal gauge values', () => {
      metrics.gauge('percentage', 87.5);

      const result = metrics.getMetrics();
      expect(result['test_percentage']).toBe(87.5);
    });

    it('should handle very large gauge values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      metrics.gauge('large_gauge', largeValue);

      const result = metrics.getMetrics();
      expect(result['test_large_gauge']).toBe(largeValue);
    });

    it('should handle multiple different gauges', () => {
      metrics.gauge('memory', 512);
      metrics.gauge('cpu', 25);
      metrics.gauge('disk', 80);

      const result = metrics.getMetrics();
      expect(result['test_memory']).toBe(512);
      expect(result['test_cpu']).toBe(25);
      expect(result['test_disk']).toBe(80);
    });

    it('should handle gauge names with special characters', () => {
      metrics.gauge('heap_size', 1024);
      metrics.gauge('gc-time', 50);
      metrics.gauge('db.connections', 10);

      const result = metrics.getMetrics();
      expect(result['test_heap_size']).toBe(1024);
      expect(result['test_gc-time']).toBe(50);
      expect(result['test_db.connections']).toBe(10);
    });
  });

  describe('timing', () => {
    it('should record single timing value', () => {
      metrics.timing('request_duration', 100);

      const result = metrics.getMetrics();
      expect(result['test_request_duration_avg']).toBe(100);
      expect(result['test_request_duration_max']).toBe(100);
      expect(result['test_request_duration_min']).toBe(100);
    });

    it('should calculate statistics for multiple timing values', () => {
      metrics.timing('response_time', 100);
      metrics.timing('response_time', 200);
      metrics.timing('response_time', 300);

      const result = metrics.getMetrics();
      expect(result['test_response_time_avg']).toBe(200);
      expect(result['test_response_time_max']).toBe(300);
      expect(result['test_response_time_min']).toBe(100);
    });

    it('should handle decimal timing values', () => {
      metrics.timing('latency', 15.5);
      metrics.timing('latency', 20.3);
      metrics.timing('latency', 18.2);

      const result = metrics.getMetrics();
      expect(result['test_latency_avg']).toBeCloseTo(18);
      expect(result['test_latency_max']).toBeCloseTo(20.3);
      expect(result['test_latency_min']).toBeCloseTo(15.5);
    });

    it('should handle zero timing values', () => {
      metrics.timing('zero_timing', 0);
      metrics.timing('zero_timing', 10);

      const result = metrics.getMetrics();
      expect(result['test_zero_timing_avg']).toBe(5);
      expect(result['test_zero_timing_max']).toBe(10);
      expect(result['test_zero_timing_min']).toBe(0);
    });

    it('should handle negative timing values', () => {
      metrics.timing('negative', -5);
      metrics.timing('negative', 5);
      metrics.timing('negative', 0);

      const result = metrics.getMetrics();
      expect(result['test_negative_avg']).toBe(0);
      expect(result['test_negative_max']).toBe(5);
      expect(result['test_negative_min']).toBe(-5);
    });

    it('should handle large timing values', () => {
      const largeValue = 1000000;
      metrics.timing('large_timing', largeValue);
      metrics.timing('large_timing', 1);

      const result = metrics.getMetrics();
      expect(result['test_large_timing_avg']).toBe(500000.5);
      expect(result['test_large_timing_max']).toBe(largeValue);
      expect(result['test_large_timing_min']).toBe(1);
    });

    it('should handle multiple different timing metrics', () => {
      metrics.timing('db_query', 50);
      metrics.timing('api_call', 200);
      metrics.timing('cache_lookup', 5);

      const result = metrics.getMetrics();
      expect(result['test_db_query_avg']).toBe(50);
      expect(result['test_api_call_avg']).toBe(200);
      expect(result['test_cache_lookup_avg']).toBe(5);
    });

    it('should handle timing names with special characters', () => {
      metrics.timing('http_200_time', 100);
      metrics.timing('cache-hit-time', 10);
      metrics.timing('db.query.time', 250);

      const result = metrics.getMetrics();
      expect(result['test_http_200_time_avg']).toBe(100);
      expect(result['test_cache-hit-time_avg']).toBe(10);
      expect(result['test_db.query.time_avg']).toBe(250);
    });

    it('should accumulate many timing values correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      values.forEach(value => metrics.timing('many_values', value));

      const result = metrics.getMetrics();
      expect(result['test_many_values_avg']).toBe(5.5);
      expect(result['test_many_values_max']).toBe(10);
      expect(result['test_many_values_min']).toBe(1);
    });

    it('should handle identical timing values', () => {
      metrics.timing('identical', 42);
      metrics.timing('identical', 42);
      metrics.timing('identical', 42);

      const result = metrics.getMetrics();
      expect(result['test_identical_avg']).toBe(42);
      expect(result['test_identical_max']).toBe(42);
      expect(result['test_identical_min']).toBe(42);
    });
  });

  describe('getMetrics', () => {
    it('should return empty object when no metrics recorded', () => {
      const result = metrics.getMetrics();
      expect(result).toEqual({});
    });

    it('should return all metric types together', () => {
      metrics.increment('requests', 5);
      metrics.gauge('memory', 256);
      metrics.timing('response_time', 100);

      const result = metrics.getMetrics();
      expect(result).toEqual({
        test_requests: 5,
        test_memory: 256,
        test_response_time_avg: 100,
        test_response_time_max: 100,
        test_response_time_min: 100,
      });
    });

    it('should not include empty timing metrics', () => {
      metrics.increment('counter', 1);
      metrics.gauge('gauge', 50);
      // No timing metrics added

      const result = metrics.getMetrics();
      expect(result).toEqual({
        test_counter: 1,
        test_gauge: 50,
      });
    });

    it('should handle complex metric combinations', () => {
      // Multiple increments
      metrics.increment('errors');
      metrics.increment('errors', 2);

      // Multiple gauges
      metrics.gauge('cpu', 50);
      metrics.gauge('cpu', 75); // Should overwrite

      // Multiple timings
      metrics.timing('latency', 10);
      metrics.timing('latency', 20);
      metrics.timing('latency', 30);

      const result = metrics.getMetrics();
      expect(result).toEqual({
        test_errors: 3,
        test_cpu: 75,
        test_latency_avg: 20,
        test_latency_max: 30,
        test_latency_min: 10,
      });
    });

    it('should maintain separate metrics for different metric names', () => {
      metrics.increment('api_requests');
      metrics.increment('db_requests', 5);
      metrics.gauge('api_memory', 100);
      metrics.gauge('db_memory', 200);
      metrics.timing('api_time', 50);
      metrics.timing('db_time', 100);

      const result = metrics.getMetrics();
      expect(result['test_api_requests']).toBe(1);
      expect(result['test_db_requests']).toBe(5);
      expect(result['test_api_memory']).toBe(100);
      expect(result['test_db_memory']).toBe(200);
      expect(result['test_api_time_avg']).toBe(50);
      expect(result['test_db_time_avg']).toBe(100);
    });

    it('should return metrics in consistent format', () => {
      metrics.increment('test_metric');

      const result1 = metrics.getMetrics();
      const result2 = metrics.getMetrics();

      expect(result1).toEqual(result2);
    });

    it('should handle metrics with same base name but different types', () => {
      metrics.increment('requests');
      metrics.gauge('requests_memory', 256);
      metrics.timing('requests_time', 100);

      const result = metrics.getMetrics();
      expect(result['test_requests']).toBe(1);
      expect(result['test_requests_memory']).toBe(256);
      expect(result['test_requests_time_avg']).toBe(100);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      metrics.increment('counter', 5);
      metrics.gauge('memory', 256);
      metrics.timing('response_time', 100);

      expect(Object.keys(metrics.getMetrics())).toHaveLength(5); // counter + gauge + 3 timing stats

      metrics.reset();

      const result = metrics.getMetrics();
      expect(result).toEqual({});
    });

    it('should allow new metrics after reset', () => {
      metrics.increment('old_counter', 10);
      metrics.reset();
      metrics.increment('new_counter', 5);

      const result = metrics.getMetrics();
      expect(result).toEqual({
        test_new_counter: 5,
      });
      expect(result['test_old_counter']).toBeUndefined();
    });

    it('should reset counters completely', () => {
      metrics.increment('requests', 100);
      metrics.reset();
      metrics.increment('requests'); // Should start from 0 again

      const result = metrics.getMetrics();
      expect(result['test_requests']).toBe(1);
    });

    it('should reset gauges completely', () => {
      metrics.gauge('memory', 512);
      metrics.reset();
      metrics.gauge('memory', 256);

      const result = metrics.getMetrics();
      expect(result['test_memory']).toBe(256);
    });

    it('should reset timings completely', () => {
      metrics.timing('response_time', 100);
      metrics.timing('response_time', 200);
      metrics.reset();
      metrics.timing('response_time', 50);

      const result = metrics.getMetrics();
      expect(result['test_response_time_avg']).toBe(50);
      expect(result['test_response_time_max']).toBe(50);
      expect(result['test_response_time_min']).toBe(50);
    });

    it('should not affect the prefix', () => {
      const prefixMetrics = new Metrics('custom');
      prefixMetrics.increment('test');
      prefixMetrics.reset();
      prefixMetrics.increment('after_reset');

      const result = prefixMetrics.getMetrics();
      expect(Object.keys(result)).toContain('custom_after_reset');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long metric names', () => {
      const longName = 'a'.repeat(1000);
      metrics.increment(longName);

      const result = metrics.getMetrics();
      expect(result[`test_${longName}`]).toBe(1);
    });

    it('should handle empty metric names', () => {
      metrics.increment('');
      metrics.gauge('', 100);
      metrics.timing('', 50);

      const result = metrics.getMetrics();
      // Note: Counters and gauges are stored separately, so gauge value 100 appears in result
      // The getMetrics() method adds gauges after counters, so gauge value overwrites counter
      expect(result['test_']).toBe(100); // gauge value overwrites counter in final result
      expect(result['test__avg']).toBe(50); // timing average
      expect(result['test__max']).toBe(50); // timing max
      expect(result['test__min']).toBe(50); // timing min
    });

    it('should handle unicode metric names', () => {
      metrics.increment('测试_metric');
      metrics.gauge('🚀_gauge', 100);
      metrics.timing('ñoño_timing', 50);

      const result = metrics.getMetrics();
      expect(result['test_测试_metric']).toBe(1);
      expect(result['test_🚀_gauge']).toBe(100);
      expect(result['test_ñoño_timing_avg']).toBe(50);
    });

    it('should handle Number.POSITIVE_INFINITY', () => {
      metrics.increment('infinity', Number.POSITIVE_INFINITY);
      metrics.gauge('infinity_gauge', Number.POSITIVE_INFINITY);
      metrics.timing('infinity_timing', Number.POSITIVE_INFINITY);

      const result = metrics.getMetrics();
      expect(result['test_infinity']).toBe(Number.POSITIVE_INFINITY);
      expect(result['test_infinity_gauge']).toBe(Number.POSITIVE_INFINITY);
      expect(result['test_infinity_timing_avg']).toBe(Number.POSITIVE_INFINITY);
    });

    it('should handle Number.NEGATIVE_INFINITY', () => {
      metrics.increment('neg_infinity', Number.NEGATIVE_INFINITY);
      metrics.gauge('neg_infinity_gauge', Number.NEGATIVE_INFINITY);
      metrics.timing('neg_infinity_timing', Number.NEGATIVE_INFINITY);

      const result = metrics.getMetrics();
      expect(result['test_neg_infinity']).toBe(Number.NEGATIVE_INFINITY);
      expect(result['test_neg_infinity_gauge']).toBe(Number.NEGATIVE_INFINITY);
      expect(result['test_neg_infinity_timing_avg']).toBe(Number.NEGATIVE_INFINITY);
    });

    it('should handle NaN values', () => {
      metrics.increment('nan', NaN);
      metrics.gauge('nan_gauge', NaN);
      metrics.timing('nan_timing', NaN);

      const result = metrics.getMetrics();
      expect(result['test_nan']).toBeNaN();
      expect(result['test_nan_gauge']).toBeNaN();
      expect(result['test_nan_timing_avg']).toBeNaN();
    });

    it('should handle mixed valid and invalid numeric values in timing', () => {
      metrics.timing('mixed', 10);
      metrics.timing('mixed', NaN);
      metrics.timing('mixed', 20);

      const result = metrics.getMetrics();
      // The NaN will affect the calculations
      expect(result['test_mixed_avg']).toBeNaN();
      expect(result['test_mixed_max']).toBeNaN();
      expect(result['test_mixed_min']).toBeNaN();
    });
  });

  describe('concurrent operations simulation', () => {
    it('should handle rapid consecutive operations', () => {
      for (let i = 0; i < 1000; i++) {
        metrics.increment('rapid_counter');
        metrics.gauge('rapid_gauge', i);
        metrics.timing('rapid_timing', i);
      }

      const result = metrics.getMetrics();
      expect(result['test_rapid_counter']).toBe(1000);
      expect(result['test_rapid_gauge']).toBe(999); // Last value
      expect(result['test_rapid_timing_avg']).toBe(499.5); // Average of 0-999
      expect(result['test_rapid_timing_max']).toBe(999);
      expect(result['test_rapid_timing_min']).toBe(0);
    });

    it('should maintain data integrity with interleaved operations', () => {
      for (let i = 0; i < 100; i++) {
        metrics.increment('interleaved_a', i);
        metrics.increment('interleaved_b', i * 2);
        metrics.gauge('gauge_a', i);
        metrics.gauge('gauge_b', i * 3);
        metrics.timing('timing_a', i);
        metrics.timing('timing_b', i * 4);
      }

      const result = metrics.getMetrics();

      // Verify counter accumulation
      expect(result['test_interleaved_a']).toBe(4950); // Sum of 0-99
      expect(result['test_interleaved_b']).toBe(9900); // Sum of 0-198 (even numbers)

      // Verify gauge final values
      expect(result['test_gauge_a']).toBe(99);
      expect(result['test_gauge_b']).toBe(297);

      // Verify timing statistics
      expect(result['test_timing_a_avg']).toBe(49.5);
      expect(result['test_timing_b_avg']).toBe(198);
    });
  });
});
