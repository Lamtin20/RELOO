// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EvidenceAnchor {
    address public immutable writer;
    mapping(bytes32 => bytes32) public digests;
    struct Stream { uint64 count; bytes32 head; }
    mapping(bytes32 => Stream) public streams;
    event Anchored(bytes32 indexed eventId, bytes32 indexed streamKey, uint64 sequence, bytes32 digest);

    constructor(address initialWriter) {
        require(initialWriter != address(0), "Writer required");
        writer = initialWriter;
    }

    function anchor(bytes32 streamKey, uint64 sequence, bytes32 previousDigest, bytes32 recordDigest) external {
        require(msg.sender == writer, "Writer only");
        require(streamKey != bytes32(0) && recordDigest != bytes32(0), "Empty digest");
        Stream storage stream = streams[streamKey];
        require(sequence == stream.count + 1 && previousDigest == stream.head, "Out of order");
        bytes32 eventId = keccak256(abi.encodePacked(streamKey, sequence));
        require(digests[eventId] == bytes32(0), "Already anchored");
        digests[eventId] = recordDigest;
        stream.count = sequence;
        stream.head = recordDigest;
        emit Anchored(eventId, streamKey, sequence, recordDigest);
    }
}
